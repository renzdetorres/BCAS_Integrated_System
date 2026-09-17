using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class SystemSettingsRepository : ISystemSettingsRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public SystemSettingsRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<SystemSetting>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT SettingKey, DisplayName, Description, IsEnabled, UpdatedAt
FROM dbo.SystemSettings
ORDER BY DisplayName;";

        await using var command = new SqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var settings = new List<SystemSetting>();
        while (await reader.ReadAsync(cancellationToken))
        {
            settings.Add(MapSetting(reader));
        }

        return settings;
    }

    public async Task<SystemSetting?> SetEnabledAsync(
        string settingKey,
        bool isEnabled,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
UPDATE dbo.SystemSettings
SET IsEnabled = @IsEnabled,
    UpdatedAt = SYSUTCDATETIME()
OUTPUT
    inserted.SettingKey,
    inserted.DisplayName,
    inserted.Description,
    inserted.IsEnabled,
    inserted.UpdatedAt
WHERE SettingKey = @SettingKey;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@IsEnabled", System.Data.SqlDbType.Bit) { Value = isEnabled });
        command.Parameters.Add(new SqlParameter("@SettingKey", System.Data.SqlDbType.NVarChar, 50) { Value = settingKey });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? MapSetting(reader) : null;
    }

    public async Task<bool> IsEnabledAsync(string settingKey, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = "SELECT IsEnabled FROM dbo.SystemSettings WHERE SettingKey = @SettingKey;";
        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@SettingKey", System.Data.SqlDbType.NVarChar, 50) { Value = settingKey });

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is not bool isEnabled || isEnabled;
    }

    private static SystemSetting MapSetting(SqlDataReader reader) => new()
    {
        SettingKey = reader.GetString(reader.GetOrdinal("SettingKey")),
        DisplayName = reader.GetString(reader.GetOrdinal("DisplayName")),
        Description = reader.GetString(reader.GetOrdinal("Description")),
        IsEnabled = reader.GetBoolean(reader.GetOrdinal("IsEnabled")),
        UpdatedAt = reader.GetDateTime(reader.GetOrdinal("UpdatedAt")),
    };
}
