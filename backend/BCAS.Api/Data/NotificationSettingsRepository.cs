using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class NotificationSettingsRepository : INotificationSettingsRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public NotificationSettingsRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<NotificationTriggerConfig>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT TriggerKey, DisplayName, Description, IsEnabled, UpdatedAt
FROM dbo.NotificationTriggerConfigs
ORDER BY DisplayName;";

        await using var command = new SqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var configs = new List<NotificationTriggerConfig>();
        while (await reader.ReadAsync(cancellationToken))
        {
            configs.Add(MapConfig(reader));
        }

        return configs;
    }

    public async Task<NotificationTriggerConfig?> SetEnabledAsync(
        string triggerKey,
        bool isEnabled,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
UPDATE dbo.NotificationTriggerConfigs
SET IsEnabled = @IsEnabled,
    UpdatedAt = SYSUTCDATETIME()
OUTPUT
    inserted.TriggerKey,
    inserted.DisplayName,
    inserted.Description,
    inserted.IsEnabled,
    inserted.UpdatedAt
WHERE TriggerKey = @TriggerKey;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@IsEnabled", System.Data.SqlDbType.Bit) { Value = isEnabled });
        command.Parameters.Add(new SqlParameter("@TriggerKey", System.Data.SqlDbType.NVarChar, 50) { Value = triggerKey });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? MapConfig(reader) : null;
    }

    private static NotificationTriggerConfig MapConfig(SqlDataReader reader) => new()
    {
        TriggerKey = reader.GetString(reader.GetOrdinal("TriggerKey")),
        DisplayName = reader.GetString(reader.GetOrdinal("DisplayName")),
        Description = reader.GetString(reader.GetOrdinal("Description")),
        IsEnabled = reader.GetBoolean(reader.GetOrdinal("IsEnabled")),
        UpdatedAt = reader.GetDateTime(reader.GetOrdinal("UpdatedAt")),
    };
}
