using System.Data;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class NotificationPreferenceRepository : INotificationPreferenceRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public NotificationPreferenceRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyDictionary<string, bool>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT NotificationType, IsEnabled
FROM dbo.NotificationPreferences
WHERE UserId = @UserId;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var preferences = new Dictionary<string, bool>(StringComparer.Ordinal);
        while (await reader.ReadAsync(cancellationToken))
        {
            preferences[reader.GetString(reader.GetOrdinal("NotificationType"))] = reader.GetBoolean(reader.GetOrdinal("IsEnabled"));
        }

        return preferences;
    }

    public async Task<bool> IsEnabledAsync(Guid userId, string notificationType, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT IsEnabled
FROM dbo.NotificationPreferences
WHERE UserId = @UserId AND NotificationType = @NotificationType;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
        command.Parameters.Add(new SqlParameter("@NotificationType", SqlDbType.NVarChar, 30) { Value = notificationType });

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is null || (bool)result;
    }

    // Comfortably under SQL Server's 2100-parameter-per-query limit
    // (1 for @NotificationType, up to this many for @UserId0..N-1).
    private const int OptedOutBatchSize = 2000;

    public async Task<IReadOnlySet<Guid>> GetOptedOutUserIdsAsync(
        IReadOnlyList<Guid> userIds, string notificationType, CancellationToken cancellationToken = default)
    {
        var optedOut = new HashSet<Guid>();
        if (userIds.Count == 0)
        {
            return optedOut;
        }

        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        foreach (var batch in userIds.Chunk(OptedOutBatchSize))
        {
            var parameterNames = batch.Select((_, i) => $"@UserId{i}").ToList();
            var sql = $@"
SELECT UserId
FROM dbo.NotificationPreferences
WHERE NotificationType = @NotificationType AND IsEnabled = 0 AND UserId IN ({string.Join(", ", parameterNames)});";

            await using var command = new SqlCommand(sql, connection);
            command.Parameters.Add(new SqlParameter("@NotificationType", SqlDbType.NVarChar, 30) { Value = notificationType });
            for (var i = 0; i < batch.Length; i++)
            {
                command.Parameters.Add(new SqlParameter(parameterNames[i], SqlDbType.UniqueIdentifier) { Value = batch[i] });
            }

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                optedOut.Add(reader.GetGuid(reader.GetOrdinal("UserId")));
            }
        }

        return optedOut;
    }

    public async Task SetEnabledAsync(Guid userId, string notificationType, bool isEnabled, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
MERGE dbo.NotificationPreferences AS target
USING (SELECT @UserId AS UserId, @NotificationType AS NotificationType) AS source
    ON target.UserId = source.UserId AND target.NotificationType = source.NotificationType
WHEN MATCHED THEN
    UPDATE SET IsEnabled = @IsEnabled, UpdatedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
    INSERT (UserId, NotificationType, IsEnabled) VALUES (@UserId, @NotificationType, @IsEnabled);";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
        command.Parameters.Add(new SqlParameter("@NotificationType", SqlDbType.NVarChar, 30) { Value = notificationType });
        command.Parameters.Add(new SqlParameter("@IsEnabled", SqlDbType.Bit) { Value = isEnabled });

        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}
