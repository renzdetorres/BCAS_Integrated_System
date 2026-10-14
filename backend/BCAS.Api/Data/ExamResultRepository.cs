using System.Data;
using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public interface IExamResultRepository
{
    /// <summary>Every attempt for the applicant's application, newest first.</summary>
    Task<IReadOnlyList<ExamResultRecord>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>Records the next attempt's result and returns it.</summary>
    Task<ExamResultRecord> InsertAsync(
        Guid applicationId,
        Guid userId,
        string result,
        decimal? score,
        string? remarks,
        DateOnly? examDate,
        Guid recordedByUserId,
        CancellationToken cancellationToken = default);

    /// <summary>Applicants who took the exam (waiting for a result) and those who already have one.</summary>
    Task<IReadOnlyList<ExamResultQueueItem>> GetQueueAsync(CancellationToken cancellationToken = default);

    Task<ExamResultQueueItem?> GetQueueItemAsync(Guid applicationId, CancellationToken cancellationToken = default);

    /// <summary>The date of the exam slot the applicant is booked into, if any.</summary>
    Task<DateOnly?> GetBookedExamDateAsync(Guid userId, CancellationToken cancellationToken = default);
}

public class ExamResultRepository : IExamResultRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public ExamResultRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<ExamResultRecord>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT ResultId, ApplicationId, UserId, Attempt, Result, Score, Remarks, ExamDate, RecordedAt
FROM dbo.ExamResults
WHERE UserId = @UserId
ORDER BY Attempt DESC;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var results = new List<ExamResultRecord>();
        while (await reader.ReadAsync(cancellationToken))
        {
            results.Add(MapRecord(reader));
        }

        return results;
    }

    public async Task<ExamResultRecord> InsertAsync(
        Guid applicationId,
        Guid userId,
        string result,
        decimal? score,
        string? remarks,
        DateOnly? examDate,
        Guid recordedByUserId,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
INSERT INTO dbo.ExamResults (ApplicationId, UserId, Attempt, Result, Score, Remarks, ExamDate, RecordedByUserId)
OUTPUT inserted.ResultId, inserted.ApplicationId, inserted.UserId, inserted.Attempt, inserted.Result, inserted.Score,
       inserted.Remarks, inserted.ExamDate, inserted.RecordedAt
SELECT @ApplicationId, @UserId, ISNULL(MAX(Attempt), 0) + 1, @Result, @Score, @Remarks, @ExamDate, @RecordedByUserId
FROM dbo.ExamResults WITH (UPDLOCK, HOLDLOCK)
WHERE ApplicationId = @ApplicationId;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = applicationId });
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
        command.Parameters.Add(new SqlParameter("@Result", SqlDbType.NVarChar, 10) { Value = result });
        command.Parameters.Add(new SqlParameter("@Score", SqlDbType.Decimal) { Precision = 5, Scale = 2, Value = (object?)score ?? DBNull.Value });
        command.Parameters.Add(new SqlParameter("@Remarks", SqlDbType.NVarChar, 500) { Value = (object?)remarks ?? DBNull.Value });
        command.Parameters.Add(new SqlParameter("@ExamDate", SqlDbType.Date) { Value = examDate is null ? DBNull.Value : examDate.Value.ToDateTime(TimeOnly.MinValue) });
        command.Parameters.Add(new SqlParameter("@RecordedByUserId", SqlDbType.UniqueIdentifier) { Value = recordedByUserId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);
        return MapRecord(reader);
    }

    public async Task<IReadOnlyList<ExamResultQueueItem>> GetQueueAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        await using var command = new SqlCommand(QueueSelect + @"
WHERE a.IsArchived = 0 AND (a.Status = N'ExamDone' OR r.ResultId IS NOT NULL)
ORDER BY CASE WHEN a.Status = N'ExamDone' THEN 0 ELSE 1 END, ISNULL(r.RecordedAt, a.SubmittedAt) DESC;", connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var items = new List<ExamResultQueueItem>();
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(MapQueueItem(reader));
        }

        return items;
    }

    public async Task<ExamResultQueueItem?> GetQueueItemAsync(Guid applicationId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        await using var command = new SqlCommand(QueueSelect + " WHERE a.ApplicationId = @ApplicationId;", connection);
        command.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = applicationId });
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? MapQueueItem(reader) : null;
    }

    public async Task<DateOnly?> GetBookedExamDateAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT sch.ExamDate
FROM dbo.ExamScheduleSelections sel
JOIN dbo.ExamSchedules sch ON sch.ExamScheduleId = sel.ExamScheduleId
WHERE sel.UserId = @UserId;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
        var value = await command.ExecuteScalarAsync(cancellationToken);
        return value is DateTime date ? DateOnly.FromDateTime(date) : null;
    }

    private const string QueueSelect = @"
SELECT a.ApplicationId, a.UserId, u.FirstName, u.LastName, u.Email, a.Department, a.CourseAppliedFor, a.YearLevel, a.Status,
       sch.ExamDate, r.Result, r.Score, r.Remarks, r.RecordedAt,
       (SELECT COUNT(*) FROM dbo.ExamResults x WHERE x.ApplicationId = a.ApplicationId) AS Attempts
FROM dbo.AdmissionApplications a
JOIN dbo.Users u ON u.UserId = a.UserId
LEFT JOIN dbo.ExamScheduleSelections sel ON sel.UserId = a.UserId
LEFT JOIN dbo.ExamSchedules sch ON sch.ExamScheduleId = sel.ExamScheduleId
OUTER APPLY (
    SELECT TOP (1) x.ResultId, x.Result, x.Score, x.Remarks, x.RecordedAt
    FROM dbo.ExamResults x
    WHERE x.ApplicationId = a.ApplicationId
    ORDER BY x.Attempt DESC
) r";

    private static ExamResultRecord MapRecord(SqlDataReader reader) => new()
    {
        ResultId = reader.GetGuid(0),
        ApplicationId = reader.GetGuid(1),
        UserId = reader.GetGuid(2),
        Attempt = reader.GetInt32(3),
        Result = reader.GetString(4),
        Score = reader.IsDBNull(5) ? null : reader.GetDecimal(5),
        Remarks = reader.IsDBNull(6) ? null : reader.GetString(6),
        ExamDate = reader.IsDBNull(7) ? null : DateOnly.FromDateTime(reader.GetDateTime(7)),
        RecordedAt = reader.GetDateTime(8),
    };

    private static ExamResultQueueItem MapQueueItem(SqlDataReader reader)
    {
        string? Text(string column) => reader.IsDBNull(reader.GetOrdinal(column)) ? null : reader.GetString(reader.GetOrdinal(column));

        return new ExamResultQueueItem
        {
            ApplicationId = reader.GetGuid(reader.GetOrdinal("ApplicationId")),
            UserId = reader.GetGuid(reader.GetOrdinal("UserId")),
            ApplicantName = $"{reader.GetString(reader.GetOrdinal("FirstName"))} {reader.GetString(reader.GetOrdinal("LastName"))}",
            ApplicantEmail = reader.GetString(reader.GetOrdinal("Email")),
            Department = Text("Department"),
            CourseAppliedFor = reader.GetString(reader.GetOrdinal("CourseAppliedFor")),
            YearLevel = Text("YearLevel"),
            ApplicationStatus = reader.GetString(reader.GetOrdinal("Status")),
            ExamDate = reader.IsDBNull(reader.GetOrdinal("ExamDate")) ? null : DateOnly.FromDateTime(reader.GetDateTime(reader.GetOrdinal("ExamDate"))),
            Result = Text("Result"),
            Score = reader.IsDBNull(reader.GetOrdinal("Score")) ? null : reader.GetDecimal(reader.GetOrdinal("Score")),
            Remarks = Text("Remarks"),
            Attempts = reader.GetInt32(reader.GetOrdinal("Attempts")),
            RecordedAt = reader.IsDBNull(reader.GetOrdinal("RecordedAt")) ? null : reader.GetDateTime(reader.GetOrdinal("RecordedAt")),
        };
    }
}
