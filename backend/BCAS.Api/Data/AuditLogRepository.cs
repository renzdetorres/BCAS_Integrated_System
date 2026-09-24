using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class AuditLogRepository : IAuditLogRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public AuditLogRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task InsertAsync(
        Guid? userId, string userEmail, string action, string? details, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
INSERT INTO dbo.AuditLogs (UserId, UserEmail, Action, Details)
VALUES (@UserId, @UserEmail, @Action, @Details);";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@UserId", System.Data.SqlDbType.UniqueIdentifier) { Value = (object?)userId ?? DBNull.Value });
        command.Parameters.Add(new SqlParameter("@UserEmail", System.Data.SqlDbType.NVarChar, 256) { Value = userEmail });
        command.Parameters.Add(new SqlParameter("@Action", System.Data.SqlDbType.NVarChar, 50) { Value = action });
        command.Parameters.Add(new SqlParameter("@Details", System.Data.SqlDbType.NVarChar, 1000) { Value = (object?)details ?? DBNull.Value });

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AuditLogEntry>> SearchAsync(
        string? email, int limit, int offset, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT AuditLogId, UserId, UserEmail, Action, Details, CreatedAt
FROM dbo.AuditLogs
WHERE @Email IS NULL OR UserEmail LIKE '%' + @Email + '%'
ORDER BY CreatedAt DESC
OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Email", System.Data.SqlDbType.NVarChar, 256) { Value = (object?)email ?? DBNull.Value });
        command.Parameters.Add(new SqlParameter("@Offset", System.Data.SqlDbType.Int) { Value = offset });
        command.Parameters.Add(new SqlParameter("@Limit", System.Data.SqlDbType.Int) { Value = limit });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var entries = new List<AuditLogEntry>();
        while (await reader.ReadAsync(cancellationToken))
        {
            entries.Add(new AuditLogEntry
            {
                AuditLogId = reader.GetGuid(reader.GetOrdinal("AuditLogId")),
                UserId = reader.IsDBNull(reader.GetOrdinal("UserId")) ? null : reader.GetGuid(reader.GetOrdinal("UserId")),
                UserEmail = reader.GetString(reader.GetOrdinal("UserEmail")),
                Action = reader.GetString(reader.GetOrdinal("Action")),
                Details = reader.IsDBNull(reader.GetOrdinal("Details")) ? null : reader.GetString(reader.GetOrdinal("Details")),
                CreatedAt = reader.GetDateTime(reader.GetOrdinal("CreatedAt")),
            });
        }

        return entries;
    }
}
