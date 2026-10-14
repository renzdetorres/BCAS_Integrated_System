using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class SchoolConfigRepository : ISchoolConfigRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public SchoolConfigRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<SchoolConfigEntry>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        await using var command = new SqlCommand("SELECT ConfigKey, ConfigValue, UpdatedAt FROM dbo.SchoolConfig;", connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var entries = new List<SchoolConfigEntry>();
        while (await reader.ReadAsync(cancellationToken))
        {
            entries.Add(new SchoolConfigEntry
            {
                ConfigKey = reader.GetString(0),
                Value = reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                UpdatedAt = reader.GetDateTime(2),
            });
        }

        return entries;
    }

    public async Task UpsertManyAsync(IReadOnlyDictionary<string, string> values, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync(cancellationToken);

        const string sql = @"
MERGE dbo.SchoolConfig AS target
USING (SELECT @ConfigKey AS ConfigKey, @ConfigValue AS ConfigValue) AS source
ON target.ConfigKey = source.ConfigKey
WHEN MATCHED THEN UPDATE SET ConfigValue = source.ConfigValue, UpdatedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (ConfigKey, ConfigValue) VALUES (source.ConfigKey, source.ConfigValue);";

        foreach (var (key, value) in values)
        {
            await using var command = new SqlCommand(sql, connection, transaction);
            command.Parameters.Add(new SqlParameter("@ConfigKey", System.Data.SqlDbType.NVarChar, 60) { Value = key });
            command.Parameters.Add(new SqlParameter("@ConfigValue", System.Data.SqlDbType.NVarChar, -1) { Value = value });
            await command.ExecuteNonQueryAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
    }
}
