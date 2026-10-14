using System.Data;
using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public interface IInterviewRepository
{
    Task<InterviewRecord?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>Schedules the interview, or replaces the existing one (back to Scheduled, evaluation cleared).</summary>
    Task<InterviewRecord> UpsertAsync(
        Guid applicationId,
        Guid userId,
        DateOnly date,
        TimeOnly time,
        string location,
        string? instructions,
        Guid scheduledByUserId,
        CancellationToken cancellationToken = default);

    /// <summary>Records the evaluation and marks the interview Completed. Null if the application has no interview.</summary>
    Task<InterviewRecord?> EvaluateAsync(
        Guid applicationId, string evaluation, string? notes, Guid evaluatedByUserId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<InterviewQueueItem>> GetQueueAsync(CancellationToken cancellationToken = default);

    Task<InterviewQueueItem?> GetQueueItemAsync(Guid applicationId, CancellationToken cancellationToken = default);
}

public class InterviewRepository : IInterviewRepository
{
    private const string Columns =
        "InterviewId, ApplicationId, UserId, InterviewDate, InterviewTime, Location, Instructions, Status, Evaluation, EvaluationNotes, ScheduledAt, EvaluatedAt";

    private readonly IDbConnectionFactory _connectionFactory;

    public InterviewRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<InterviewRecord?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        await using var command = new SqlCommand($"SELECT TOP (1) {Columns} FROM dbo.InterviewSchedules WHERE UserId = @UserId ORDER BY ScheduledAt DESC;", connection);
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? Map(reader) : null;
    }

    public async Task<InterviewRecord> UpsertAsync(
        Guid applicationId,
        Guid userId,
        DateOnly date,
        TimeOnly time,
        string location,
        string? instructions,
        Guid scheduledByUserId,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        var sql = $@"
MERGE dbo.InterviewSchedules WITH (HOLDLOCK) AS target
USING (SELECT @ApplicationId AS ApplicationId) AS source
ON target.ApplicationId = source.ApplicationId
WHEN MATCHED THEN
    UPDATE SET InterviewDate = @Date, InterviewTime = @Time, Location = @Location, Instructions = @Instructions,
               Status = N'Scheduled', Evaluation = NULL, EvaluationNotes = NULL, EvaluatedByUserId = NULL, EvaluatedAt = NULL,
               ScheduledByUserId = @ScheduledByUserId, ScheduledAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
    INSERT (ApplicationId, UserId, InterviewDate, InterviewTime, Location, Instructions, ScheduledByUserId)
    VALUES (@ApplicationId, @UserId, @Date, @Time, @Location, @Instructions, @ScheduledByUserId)
OUTPUT inserted.InterviewId, inserted.ApplicationId, inserted.UserId, inserted.InterviewDate, inserted.InterviewTime,
       inserted.Location, inserted.Instructions, inserted.Status, inserted.Evaluation, inserted.EvaluationNotes,
       inserted.ScheduledAt, inserted.EvaluatedAt;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = applicationId });
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
        command.Parameters.Add(new SqlParameter("@Date", SqlDbType.Date) { Value = date.ToDateTime(TimeOnly.MinValue) });
        command.Parameters.Add(new SqlParameter("@Time", SqlDbType.Time) { Value = time.ToTimeSpan() });
        command.Parameters.Add(new SqlParameter("@Location", SqlDbType.NVarChar, 200) { Value = location });
        command.Parameters.Add(new SqlParameter("@Instructions", SqlDbType.NVarChar, 500) { Value = (object?)instructions ?? DBNull.Value });
        command.Parameters.Add(new SqlParameter("@ScheduledByUserId", SqlDbType.UniqueIdentifier) { Value = scheduledByUserId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);
        return Map(reader);
    }

    public async Task<InterviewRecord?> EvaluateAsync(
        Guid applicationId, string evaluation, string? notes, Guid evaluatedByUserId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
UPDATE dbo.InterviewSchedules
SET Status = N'Completed', Evaluation = @Evaluation, EvaluationNotes = @Notes,
    EvaluatedByUserId = @EvaluatedByUserId, EvaluatedAt = SYSUTCDATETIME()
OUTPUT inserted.InterviewId, inserted.ApplicationId, inserted.UserId, inserted.InterviewDate, inserted.InterviewTime,
       inserted.Location, inserted.Instructions, inserted.Status, inserted.Evaluation, inserted.EvaluationNotes,
       inserted.ScheduledAt, inserted.EvaluatedAt
WHERE ApplicationId = @ApplicationId;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = applicationId });
        command.Parameters.Add(new SqlParameter("@Evaluation", SqlDbType.NVarChar, 10) { Value = evaluation });
        command.Parameters.Add(new SqlParameter("@Notes", SqlDbType.NVarChar, 500) { Value = (object?)notes ?? DBNull.Value });
        command.Parameters.Add(new SqlParameter("@EvaluatedByUserId", SqlDbType.UniqueIdentifier) { Value = evaluatedByUserId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? Map(reader) : null;
    }

    public async Task<IReadOnlyList<InterviewQueueItem>> GetQueueAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        await using var command = new SqlCommand(QueueSelect + @"
WHERE a.IsArchived = 0 AND (a.Status = N'Registration' OR i.InterviewId IS NOT NULL)
ORDER BY CASE WHEN i.InterviewId IS NULL THEN 0 WHEN i.Evaluation IS NULL THEN 1 ELSE 2 END, i.InterviewDate ASC, a.SubmittedAt ASC;", connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var items = new List<InterviewQueueItem>();
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(MapQueueItem(reader));
        }

        return items;
    }

    public async Task<InterviewQueueItem?> GetQueueItemAsync(Guid applicationId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        await using var command = new SqlCommand(QueueSelect + " WHERE a.ApplicationId = @ApplicationId;", connection);
        command.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = applicationId });
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? MapQueueItem(reader) : null;
    }

    private const string QueueSelect = @"
SELECT a.ApplicationId, a.UserId, u.FirstName, u.LastName, u.Email, a.Department, a.CourseAppliedFor, a.YearLevel, a.Status,
       i.InterviewDate, i.InterviewTime, i.Location, i.Instructions, i.Evaluation, i.EvaluationNotes, i.EvaluatedAt
FROM dbo.AdmissionApplications a
JOIN dbo.Users u ON u.UserId = a.UserId
LEFT JOIN dbo.InterviewSchedules i ON i.ApplicationId = a.ApplicationId";

    private static InterviewRecord Map(SqlDataReader reader) => new()
    {
        InterviewId = reader.GetGuid(0),
        ApplicationId = reader.GetGuid(1),
        UserId = reader.GetGuid(2),
        InterviewDate = DateOnly.FromDateTime(reader.GetDateTime(3)),
        InterviewTime = TimeOnly.FromTimeSpan(reader.GetTimeSpan(4)),
        Location = reader.GetString(5),
        Instructions = reader.IsDBNull(6) ? null : reader.GetString(6),
        Status = reader.GetString(7),
        Evaluation = reader.IsDBNull(8) ? null : reader.GetString(8),
        EvaluationNotes = reader.IsDBNull(9) ? null : reader.GetString(9),
        ScheduledAt = reader.GetDateTime(10),
        EvaluatedAt = reader.IsDBNull(11) ? null : reader.GetDateTime(11),
    };

    private static InterviewQueueItem MapQueueItem(SqlDataReader reader)
    {
        string? Text(string column) => reader.IsDBNull(reader.GetOrdinal(column)) ? null : reader.GetString(reader.GetOrdinal(column));

        return new InterviewQueueItem
        {
            ApplicationId = reader.GetGuid(reader.GetOrdinal("ApplicationId")),
            UserId = reader.GetGuid(reader.GetOrdinal("UserId")),
            ApplicantName = $"{reader.GetString(reader.GetOrdinal("FirstName"))} {reader.GetString(reader.GetOrdinal("LastName"))}",
            ApplicantEmail = reader.GetString(reader.GetOrdinal("Email")),
            Department = Text("Department"),
            CourseAppliedFor = reader.GetString(reader.GetOrdinal("CourseAppliedFor")),
            YearLevel = Text("YearLevel"),
            ApplicationStatus = reader.GetString(reader.GetOrdinal("Status")),
            InterviewDate = reader.IsDBNull(reader.GetOrdinal("InterviewDate")) ? null : DateOnly.FromDateTime(reader.GetDateTime(reader.GetOrdinal("InterviewDate"))),
            InterviewTime = reader.IsDBNull(reader.GetOrdinal("InterviewTime")) ? null : TimeOnly.FromTimeSpan(reader.GetTimeSpan(reader.GetOrdinal("InterviewTime"))),
            Location = Text("Location"),
            Instructions = Text("Instructions"),
            Evaluation = Text("Evaluation"),
            EvaluationNotes = Text("EvaluationNotes"),
            EvaluatedAt = reader.IsDBNull(reader.GetOrdinal("EvaluatedAt")) ? null : reader.GetDateTime(reader.GetOrdinal("EvaluatedAt")),
        };
    }
}
