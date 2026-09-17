using System.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class ExamRescheduleRequestRepository : IExamRescheduleRequestRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public ExamRescheduleRequestRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<ExamRescheduleRequest?> GetLatestByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT TOP (1) RequestId, UserId, Reason, Status, SubmittedAt
FROM dbo.ExamRescheduleRequests
WHERE UserId = @UserId
ORDER BY SubmittedAt DESC;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? MapRequest(reader) : null;
    }

    public async Task<ExamRescheduleRequest> CreateAsync(Guid userId, string reason, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string pendingCheckSql = "SELECT 1 FROM dbo.ExamRescheduleRequests WHERE UserId = @UserId AND Status = N'Pending';";
        await using (var pendingCheckCommand = new SqlCommand(pendingCheckSql, connection))
        {
            pendingCheckCommand.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
            var alreadyPending = await pendingCheckCommand.ExecuteScalarAsync(cancellationToken);
            if (alreadyPending is not null)
            {
                throw new RescheduleRequestAlreadyPendingException();
            }
        }

        const string insertSql = @"
INSERT INTO dbo.ExamRescheduleRequests (UserId, Reason)
OUTPUT inserted.RequestId, inserted.UserId, inserted.Reason, inserted.Status, inserted.SubmittedAt
VALUES (@UserId, @Reason);";

        await using var insertCommand = new SqlCommand(insertSql, connection);
        insertCommand.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
        insertCommand.Parameters.Add(new SqlParameter("@Reason", SqlDbType.NVarChar, 500) { Value = reason });

        await using var reader = await insertCommand.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);
        return MapRequest(reader);
    }

    private static ExamRescheduleRequest MapRequest(SqlDataReader reader) => new()
    {
        RequestId = reader.GetGuid(reader.GetOrdinal("RequestId")),
        UserId = reader.GetGuid(reader.GetOrdinal("UserId")),
        Reason = reader.GetString(reader.GetOrdinal("Reason")),
        Status = reader.GetString(reader.GetOrdinal("Status")),
        SubmittedAt = reader.GetDateTime(reader.GetOrdinal("SubmittedAt")),
    };
}
