using System.Data;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class RoleAccessRepository : IRoleAccessRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public RoleAccessRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<(string RoleName, string FeatureKey)>> GetBlockedAsync(CancellationToken cancellationToken = default)
    {
        var blocked = new List<(string, string)>();
        try
        {
            await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
            await using var command = new SqlCommand("SELECT RoleName, FeatureKey FROM dbo.RoleBlockedFeatures;", connection);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                blocked.Add((reader.GetString(0), reader.GetString(1)));
            }
        }
        catch (SqlException ex) when (ex.Number == 208)
        {
            // The table isn't there yet (schema.sql not run on this database).
            // Treat that as "nothing blocked" instead of failing every request
            // that passes through the access check.
        }

        return blocked;
    }

    public async Task SetBlockedAsync(string roleName, string featureKey, bool blocked, Guid changedByUserId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        // Blocking is a row; allowing deletes it, so "nothing blocked" is the
        // default and a feature added later is available until switched off.
        var sql = blocked
            ? @"IF NOT EXISTS (SELECT 1 FROM dbo.RoleBlockedFeatures WHERE RoleName = @RoleName AND FeatureKey = @FeatureKey)
                    INSERT INTO dbo.RoleBlockedFeatures (RoleName, FeatureKey, BlockedByUserId) VALUES (@RoleName, @FeatureKey, @UserId);"
            : "DELETE FROM dbo.RoleBlockedFeatures WHERE RoleName = @RoleName AND FeatureKey = @FeatureKey;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@RoleName", SqlDbType.NVarChar, 30) { Value = roleName });
        command.Parameters.Add(new SqlParameter("@FeatureKey", SqlDbType.NVarChar, 100) { Value = featureKey });
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = changedByUserId });
        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}
