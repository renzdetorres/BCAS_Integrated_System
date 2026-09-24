using System.Data;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class DeadlineReminderRepository : IDeadlineReminderRepository
{
    // Comfortably under SQL Server's 2100-parameter-per-query limit.
    private const int BatchSize = 2000;

    private readonly IDbConnectionFactory _connectionFactory;

    public DeadlineReminderRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<(Guid UserId, string FirstName, string Email, int ExamScheduleId, DateOnly ExamDate, TimeOnly ExamTime, string Venue)>>
        GetExamsOnDateAsync(DateOnly examDate, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT u.UserId, u.FirstName, u.Email, sch.ExamScheduleId, sch.ExamDate, sch.ExamTime, sch.Venue
FROM dbo.ExamScheduleSelections sel
JOIN dbo.ExamSchedules sch ON sch.ExamScheduleId = sel.ExamScheduleId
JOIN dbo.Users u ON u.UserId = sel.UserId
WHERE sch.ExamDate = @ExamDate;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@ExamDate", SqlDbType.Date) { Value = examDate.ToDateTime(TimeOnly.MinValue) });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var results = new List<(Guid, string, string, int, DateOnly, TimeOnly, string)>();
        while (await reader.ReadAsync(cancellationToken))
        {
            results.Add((
                reader.GetGuid(reader.GetOrdinal("UserId")),
                reader.GetString(reader.GetOrdinal("FirstName")),
                reader.GetString(reader.GetOrdinal("Email")),
                reader.GetInt32(reader.GetOrdinal("ExamScheduleId")),
                DateOnly.FromDateTime(reader.GetDateTime(reader.GetOrdinal("ExamDate"))),
                TimeOnly.FromTimeSpan(reader.GetTimeSpan(reader.GetOrdinal("ExamTime"))),
                reader.GetString(reader.GetOrdinal("Venue"))));
        }

        return results;
    }

    public async Task<IReadOnlyList<(Guid UserId, string FirstName, string Email, string ApplicationType)>>
        GetStaleAdmissionApplicantsAsync(DateTime submittedAtOrBeforeUtc, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT u.UserId, u.FirstName, u.Email, a.ApplicationType
FROM dbo.AdmissionApplications a
JOIN dbo.Users u ON u.UserId = a.UserId
WHERE a.IsArchived = 0 AND a.Status <> N'Rejected' AND a.SubmittedAt <= @Cutoff;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Cutoff", SqlDbType.DateTime2) { Value = submittedAtOrBeforeUtc });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var results = new List<(Guid, string, string, string)>();
        while (await reader.ReadAsync(cancellationToken))
        {
            results.Add((
                reader.GetGuid(reader.GetOrdinal("UserId")),
                reader.GetString(reader.GetOrdinal("FirstName")),
                reader.GetString(reader.GetOrdinal("Email")),
                reader.GetString(reader.GetOrdinal("ApplicationType"))));
        }

        return results;
    }

    public async Task<IReadOnlySet<string>> GetUploadedDocumentTypesAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT DocumentType
FROM dbo.ApplicantDocuments
WHERE UserId = @UserId AND IsArchived = 0;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var types = new HashSet<string>(StringComparer.Ordinal);
        while (await reader.ReadAsync(cancellationToken))
        {
            types.Add(reader.GetString(reader.GetOrdinal("DocumentType")));
        }

        return types;
    }

    public async Task<int> GetStalePendingDocumentCountAsync(DateTime uploadedAtOrBeforeUtc, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT COUNT(*)
FROM dbo.ApplicantDocuments
WHERE IsArchived = 0 AND Status = N'Pending' AND UploadedAt <= @Cutoff;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Cutoff", SqlDbType.DateTime2) { Value = uploadedAtOrBeforeUtc });

        return (int)(await command.ExecuteScalarAsync(cancellationToken))!;
    }

    public async Task<IReadOnlyList<(Guid UserId, string FirstName, string Email)>> GetStaffRecipientsAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT u.UserId, u.FirstName, u.Email
FROM dbo.Users u
JOIN dbo.Roles r ON r.RoleId = u.RoleId
WHERE r.RoleName IN (N'SupportStaff', N'Admin') AND u.IsActive = 1;";

        await using var command = new SqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var results = new List<(Guid, string, string)>();
        while (await reader.ReadAsync(cancellationToken))
        {
            results.Add((
                reader.GetGuid(reader.GetOrdinal("UserId")),
                reader.GetString(reader.GetOrdinal("FirstName")),
                reader.GetString(reader.GetOrdinal("Email"))));
        }

        return results;
    }

    public async Task<IReadOnlySet<string>> GetAlreadySentAsync(
        string reminderType, IReadOnlyList<string> candidateSubjectKeys, CancellationToken cancellationToken = default)
    {
        var alreadySent = new HashSet<string>(StringComparer.Ordinal);
        if (candidateSubjectKeys.Count == 0)
        {
            return alreadySent;
        }

        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        foreach (var batch in candidateSubjectKeys.Chunk(BatchSize))
        {
            var parameterNames = batch.Select((_, i) => $"@Key{i}").ToList();
            var sql = $@"
SELECT SubjectKey
FROM dbo.SentReminders
WHERE ReminderType = @ReminderType AND SubjectKey IN ({string.Join(", ", parameterNames)});";

            await using var command = new SqlCommand(sql, connection);
            command.Parameters.Add(new SqlParameter("@ReminderType", SqlDbType.NVarChar, 50) { Value = reminderType });
            for (var i = 0; i < batch.Length; i++)
            {
                command.Parameters.Add(new SqlParameter(parameterNames[i], SqlDbType.NVarChar, 200) { Value = batch[i] });
            }

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                alreadySent.Add(reader.GetString(reader.GetOrdinal("SubjectKey")));
            }
        }

        return alreadySent;
    }

    public async Task RecordSentAsync(string reminderType, string subjectKey, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
IF NOT EXISTS (SELECT 1 FROM dbo.SentReminders WHERE ReminderType = @ReminderType AND SubjectKey = @SubjectKey)
    INSERT INTO dbo.SentReminders (ReminderType, SubjectKey) VALUES (@ReminderType, @SubjectKey);";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@ReminderType", SqlDbType.NVarChar, 50) { Value = reminderType });
        command.Parameters.Add(new SqlParameter("@SubjectKey", SqlDbType.NVarChar, 200) { Value = subjectKey });

        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}
