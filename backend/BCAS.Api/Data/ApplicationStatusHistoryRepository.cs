using System.Data;
using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class ApplicationStatusHistoryRepository : IApplicationStatusHistoryRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public ApplicationStatusHistoryRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task InsertAsync(
        Guid applicationId,
        string category,
        string? fromStatus,
        string toStatus,
        string? remarks,
        Guid? changedByUserId,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
INSERT INTO dbo.ApplicationStatusHistory (ApplicationId, Category, FromStatus, ToStatus, Remarks, ChangedByUserId)
VALUES (@ApplicationId, @Category, @FromStatus, @ToStatus, @Remarks, @ChangedByUserId);";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = applicationId });
        command.Parameters.Add(new SqlParameter("@Category", SqlDbType.NVarChar, 20) { Value = category });
        command.Parameters.Add(new SqlParameter("@FromStatus", SqlDbType.NVarChar, 30) { Value = (object?)fromStatus ?? DBNull.Value });
        command.Parameters.Add(new SqlParameter("@ToStatus", SqlDbType.NVarChar, 30) { Value = toStatus });
        command.Parameters.Add(new SqlParameter("@Remarks", SqlDbType.NVarChar, 1000) { Value = (object?)remarks ?? DBNull.Value });
        command.Parameters.Add(new SqlParameter("@ChangedByUserId", SqlDbType.UniqueIdentifier) { Value = (object?)changedByUserId ?? DBNull.Value });

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ApplicationStatusHistoryEntry>> GetByApplicationIdAsync(
        Guid applicationId,
        string category,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT h.HistoryId, h.ApplicationId, h.Category, h.FromStatus, h.ToStatus, h.Remarks, h.ChangedByUserId, h.ChangedAt,
       u.FirstName, u.LastName
FROM dbo.ApplicationStatusHistory h
LEFT JOIN dbo.Users u ON u.UserId = h.ChangedByUserId
WHERE h.ApplicationId = @ApplicationId AND h.Category = @Category
ORDER BY h.ChangedAt ASC;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = applicationId });
        command.Parameters.Add(new SqlParameter("@Category", SqlDbType.NVarChar, 20) { Value = category });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var entries = new List<ApplicationStatusHistoryEntry>();
        while (await reader.ReadAsync(cancellationToken))
        {
            var changedByUserId = reader.IsDBNull(reader.GetOrdinal("ChangedByUserId"))
                ? (Guid?)null
                : reader.GetGuid(reader.GetOrdinal("ChangedByUserId"));

            entries.Add(new ApplicationStatusHistoryEntry
            {
                HistoryId = reader.GetGuid(reader.GetOrdinal("HistoryId")),
                ApplicationId = reader.GetGuid(reader.GetOrdinal("ApplicationId")),
                Category = reader.GetString(reader.GetOrdinal("Category")),
                FromStatus = reader.IsDBNull(reader.GetOrdinal("FromStatus")) ? null : reader.GetString(reader.GetOrdinal("FromStatus")),
                ToStatus = reader.GetString(reader.GetOrdinal("ToStatus")),
                Remarks = reader.IsDBNull(reader.GetOrdinal("Remarks")) ? null : reader.GetString(reader.GetOrdinal("Remarks")),
                ChangedByUserId = changedByUserId,
                ChangedByName = changedByUserId is null
                    ? null
                    : $"{reader.GetString(reader.GetOrdinal("FirstName"))} {reader.GetString(reader.GetOrdinal("LastName"))}",
                ChangedAt = reader.GetDateTime(reader.GetOrdinal("ChangedAt")),
            });
        }

        return entries;
    }
}
