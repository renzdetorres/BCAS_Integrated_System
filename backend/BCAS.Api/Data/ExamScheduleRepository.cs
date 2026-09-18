using System.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class ExamScheduleRepository : IExamScheduleRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public ExamScheduleRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<ExamSchedule>> GetAvailableAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT ExamScheduleId, DayType, ExamDate, ExamTime, Venue, IsOffered
FROM dbo.ExamSchedules
WHERE DayType = N'Saturday' OR (DayType = N'Weekday' AND IsOffered = 1)
ORDER BY ExamDate ASC, ExamTime ASC;";

        await using var command = new SqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var schedules = new List<ExamSchedule>();
        while (await reader.ReadAsync(cancellationToken))
        {
            schedules.Add(MapSchedule(reader));
        }

        return schedules;
    }

    public async Task<ExamScheduleSelection?> GetSelectionByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT sel.ExamScheduleSelectionId, sel.UserId, sel.ExamScheduleId, sch.DayType, sch.ExamDate, sch.ExamTime,
       sch.Venue, sel.SelectedAt, sel.IsPermitReleased, sel.PermitReleasedAt
FROM dbo.ExamScheduleSelections sel
JOIN dbo.ExamSchedules sch ON sch.ExamScheduleId = sel.ExamScheduleId
WHERE sel.UserId = @UserId;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? MapSelection(reader) : null;
    }

    public async Task<ExamScheduleSelection> SelectAsync(Guid userId, int examScheduleId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var transaction = (SqlTransaction)await connection.BeginTransactionAsync(cancellationToken);

        try
        {
            await EnsureSelectableAsync(connection, transaction, examScheduleId, cancellationToken);

            const string upsertSql = @"
MERGE dbo.ExamScheduleSelections AS target
USING (SELECT @UserId AS UserId) AS source
ON target.UserId = source.UserId
WHEN MATCHED THEN
    UPDATE SET ExamScheduleId = @ExamScheduleId, SelectedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
    INSERT (UserId, ExamScheduleId)
    VALUES (@UserId, @ExamScheduleId);";

            await using (var upsertCommand = new SqlCommand(upsertSql, connection, transaction))
            {
                upsertCommand.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
                upsertCommand.Parameters.Add(new SqlParameter("@ExamScheduleId", SqlDbType.Int) { Value = examScheduleId });
                await upsertCommand.ExecuteNonQueryAsync(cancellationToken);
            }

            await transaction.CommitAsync(cancellationToken);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
        finally
        {
            await transaction.DisposeAsync();
        }

        return (await GetSelectionByUserIdAsync(userId, cancellationToken))!;
    }

    /// <summary>
    /// Throws ExamScheduleNotFoundException / ExamScheduleNotAvailableException
    /// if the id can't be selected. Runs inside SelectAsync's transaction so
    /// the check and the write it gates see a consistent snapshot.
    /// </summary>
    private static async Task EnsureSelectableAsync(
        SqlConnection connection, SqlTransaction transaction, int examScheduleId, CancellationToken cancellationToken)
    {
        const string sql = "SELECT DayType, IsOffered FROM dbo.ExamSchedules WHERE ExamScheduleId = @ExamScheduleId;";
        await using var command = new SqlCommand(sql, connection, transaction);
        command.Parameters.Add(new SqlParameter("@ExamScheduleId", SqlDbType.Int) { Value = examScheduleId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new ExamScheduleNotFoundException(examScheduleId);
        }

        var dayType = reader.GetString(reader.GetOrdinal("DayType"));
        var isOffered = reader.GetBoolean(reader.GetOrdinal("IsOffered"));
        if (dayType == "Weekday" && !isOffered)
        {
            throw new ExamScheduleNotAvailableException("This weekday schedule is not currently being offered.");
        }
    }

    public async Task<ExamSchedule> CreateAsync(
        string dayType,
        DateOnly examDate,
        TimeOnly examTime,
        string venue,
        bool isOffered,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
INSERT INTO dbo.ExamSchedules (DayType, ExamDate, ExamTime, Venue, IsOffered)
OUTPUT inserted.ExamScheduleId, inserted.DayType, inserted.ExamDate, inserted.ExamTime, inserted.Venue, inserted.IsOffered
VALUES (@DayType, @ExamDate, @ExamTime, @Venue, @IsOffered);";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@DayType", SqlDbType.NVarChar, 10) { Value = dayType });
        command.Parameters.Add(new SqlParameter("@ExamDate", SqlDbType.Date) { Value = examDate.ToDateTime(TimeOnly.MinValue) });
        command.Parameters.Add(new SqlParameter("@ExamTime", SqlDbType.Time) { Value = examTime.ToTimeSpan() });
        command.Parameters.Add(new SqlParameter("@Venue", SqlDbType.NVarChar, 200) { Value = venue });
        command.Parameters.Add(new SqlParameter("@IsOffered", SqlDbType.Bit) { Value = isOffered });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);
        return MapSchedule(reader);
    }

    public async Task<ExamSchedule?> SetOfferedAsync(int examScheduleId, bool isOffered, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
UPDATE dbo.ExamSchedules
SET IsOffered = @IsOffered
OUTPUT inserted.ExamScheduleId, inserted.DayType, inserted.ExamDate, inserted.ExamTime, inserted.Venue, inserted.IsOffered
WHERE ExamScheduleId = @ExamScheduleId;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@IsOffered", SqlDbType.Bit) { Value = isOffered });
        command.Parameters.Add(new SqlParameter("@ExamScheduleId", SqlDbType.Int) { Value = examScheduleId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? MapSchedule(reader) : null;
    }

    public async Task<IReadOnlyList<AdminExamSchedule>> GetAllWithApplicantsAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        var schedules = new Dictionary<int, AdminExamSchedule>();
        var applicantsBySchedule = new Dictionary<int, List<AssignedApplicant>>();

        const string schedulesSql = @"
SELECT ExamScheduleId, DayType, ExamDate, ExamTime, Venue, IsOffered
FROM dbo.ExamSchedules
ORDER BY ExamDate ASC, ExamTime ASC;";

        await using (var command = new SqlCommand(schedulesSql, connection))
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                var schedule = MapSchedule(reader);
                schedules[schedule.ExamScheduleId] = new AdminExamSchedule
                {
                    ExamScheduleId = schedule.ExamScheduleId,
                    DayType = schedule.DayType,
                    ExamDate = schedule.ExamDate,
                    ExamTime = schedule.ExamTime,
                    Venue = schedule.Venue,
                    IsOffered = schedule.IsOffered,
                };
                applicantsBySchedule[schedule.ExamScheduleId] = new List<AssignedApplicant>();
            }
        }

        const string applicantsSql = @"
SELECT sel.ExamScheduleId, sel.UserId, u.FirstName, u.LastName, u.Email, sel.SelectedAt
FROM dbo.ExamScheduleSelections sel
JOIN dbo.Users u ON u.UserId = sel.UserId
ORDER BY sel.SelectedAt ASC;";

        await using (var command = new SqlCommand(applicantsSql, connection))
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                var examScheduleId = reader.GetInt32(reader.GetOrdinal("ExamScheduleId"));
                if (!applicantsBySchedule.TryGetValue(examScheduleId, out var applicants))
                {
                    continue;
                }

                applicants.Add(new AssignedApplicant
                {
                    UserId = reader.GetGuid(reader.GetOrdinal("UserId")),
                    ApplicantName = $"{reader.GetString(reader.GetOrdinal("FirstName"))} {reader.GetString(reader.GetOrdinal("LastName"))}",
                    ApplicantEmail = reader.GetString(reader.GetOrdinal("Email")),
                    SelectedAt = reader.GetDateTime(reader.GetOrdinal("SelectedAt")),
                });
            }
        }

        foreach (var (examScheduleId, applicants) in applicantsBySchedule)
        {
            schedules[examScheduleId].AssignedApplicants = applicants;
        }

        return schedules.Values
            .OrderBy(s => s.ExamDate)
            .ThenBy(s => s.ExamTime)
            .ToList();
    }

    private static ExamSchedule MapSchedule(SqlDataReader reader) => new()
    {
        ExamScheduleId = reader.GetInt32(reader.GetOrdinal("ExamScheduleId")),
        DayType = reader.GetString(reader.GetOrdinal("DayType")),
        ExamDate = DateOnly.FromDateTime(reader.GetDateTime(reader.GetOrdinal("ExamDate"))),
        ExamTime = TimeOnly.FromTimeSpan(reader.GetTimeSpan(reader.GetOrdinal("ExamTime"))),
        Venue = reader.GetString(reader.GetOrdinal("Venue")),
        IsOffered = reader.GetBoolean(reader.GetOrdinal("IsOffered")),
    };

    private static ExamScheduleSelection MapSelection(SqlDataReader reader) => new()
    {
        ExamScheduleSelectionId = reader.GetInt32(reader.GetOrdinal("ExamScheduleSelectionId")),
        UserId = reader.GetGuid(reader.GetOrdinal("UserId")),
        ExamScheduleId = reader.GetInt32(reader.GetOrdinal("ExamScheduleId")),
        DayType = reader.GetString(reader.GetOrdinal("DayType")),
        ExamDate = DateOnly.FromDateTime(reader.GetDateTime(reader.GetOrdinal("ExamDate"))),
        ExamTime = TimeOnly.FromTimeSpan(reader.GetTimeSpan(reader.GetOrdinal("ExamTime"))),
        Venue = reader.GetString(reader.GetOrdinal("Venue")),
        SelectedAt = reader.GetDateTime(reader.GetOrdinal("SelectedAt")),
        IsPermitReleased = reader.GetBoolean(reader.GetOrdinal("IsPermitReleased")),
        PermitReleasedAt = reader.IsDBNull(reader.GetOrdinal("PermitReleasedAt")) ? null : reader.GetDateTime(reader.GetOrdinal("PermitReleasedAt")),
    };

    public async Task<IReadOnlyList<AdminExamPermitCandidate>> GetAllSelectionsWithApplicantsAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT sel.ExamScheduleSelectionId, sel.UserId, u.FirstName, u.LastName, u.Email,
       sel.ExamScheduleId, sch.DayType, sch.ExamDate, sch.ExamTime, sch.Venue,
       sel.SelectedAt, sel.IsPermitReleased, sel.PermitReleasedAt
FROM dbo.ExamScheduleSelections sel
JOIN dbo.ExamSchedules sch ON sch.ExamScheduleId = sel.ExamScheduleId
JOIN dbo.Users u ON u.UserId = sel.UserId
ORDER BY sel.SelectedAt ASC;";

        await using var command = new SqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var candidates = new List<AdminExamPermitCandidate>();
        while (await reader.ReadAsync(cancellationToken))
        {
            candidates.Add(MapCandidate(reader));
        }

        return candidates;
    }

    public async Task<AdminExamPermitCandidate?> GetPermitCandidateByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT sel.ExamScheduleSelectionId, sel.UserId, u.FirstName, u.LastName, u.Email,
       sel.ExamScheduleId, sch.DayType, sch.ExamDate, sch.ExamTime, sch.Venue,
       sel.SelectedAt, sel.IsPermitReleased, sel.PermitReleasedAt
FROM dbo.ExamScheduleSelections sel
JOIN dbo.ExamSchedules sch ON sch.ExamScheduleId = sel.ExamScheduleId
JOIN dbo.Users u ON u.UserId = sel.UserId
WHERE sel.UserId = @UserId;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? MapCandidate(reader) : null;
    }

    public async Task<AdminExamPermitCandidate?> ReleasePermitAsync(Guid userId, Guid releasedByUserId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        // A no-op UPDATE (0 rows) when there's no selection, or when the
        // permit is already released - either way the read below reports
        // the current state.
        const string updateSql = @"
UPDATE dbo.ExamScheduleSelections
SET IsPermitReleased = 1, PermitReleasedAt = SYSUTCDATETIME(), PermitReleasedByUserId = @ReleasedByUserId
WHERE UserId = @UserId AND IsPermitReleased = 0;";

        await using (var command = new SqlCommand(updateSql, connection))
        {
            command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
            command.Parameters.Add(new SqlParameter("@ReleasedByUserId", SqlDbType.UniqueIdentifier) { Value = releasedByUserId });
            await command.ExecuteNonQueryAsync(cancellationToken);
        }

        return await GetPermitCandidateByUserIdAsync(userId, cancellationToken);
    }

    private static AdminExamPermitCandidate MapCandidate(SqlDataReader reader) => new()
    {
        ExamScheduleSelectionId = reader.GetInt32(reader.GetOrdinal("ExamScheduleSelectionId")),
        UserId = reader.GetGuid(reader.GetOrdinal("UserId")),
        ApplicantName = $"{reader.GetString(reader.GetOrdinal("FirstName"))} {reader.GetString(reader.GetOrdinal("LastName"))}",
        ApplicantEmail = reader.GetString(reader.GetOrdinal("Email")),
        ExamScheduleId = reader.GetInt32(reader.GetOrdinal("ExamScheduleId")),
        DayType = reader.GetString(reader.GetOrdinal("DayType")),
        ExamDate = DateOnly.FromDateTime(reader.GetDateTime(reader.GetOrdinal("ExamDate"))),
        ExamTime = TimeOnly.FromTimeSpan(reader.GetTimeSpan(reader.GetOrdinal("ExamTime"))),
        Venue = reader.GetString(reader.GetOrdinal("Venue")),
        SelectedAt = reader.GetDateTime(reader.GetOrdinal("SelectedAt")),
        IsPermitReleased = reader.GetBoolean(reader.GetOrdinal("IsPermitReleased")),
        PermitReleasedAt = reader.IsDBNull(reader.GetOrdinal("PermitReleasedAt")) ? null : reader.GetDateTime(reader.GetOrdinal("PermitReleasedAt")),
    };
}
