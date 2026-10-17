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
SELECT sch.ExamScheduleId, sch.DayType, sch.ExamDate, sch.ExamTime, sch.Venue, sch.IsOffered, sch.Capacity,
       (SELECT COUNT(*) FROM dbo.ExamScheduleSelections sel
        WHERE sel.ExamScheduleId = sch.ExamScheduleId AND sel.ExamStatus IN (N'Scheduled', N'ExamDone')) AS Taken
FROM dbo.ExamSchedules sch
WHERE sch.IsOffered = 1
  AND (sch.ExamDate > CAST(SWITCHOFFSET(SYSDATETIMEOFFSET(), N'+08:00') AS DATE)
       OR (sch.ExamDate = CAST(SWITCHOFFSET(SYSDATETIMEOFFSET(), N'+08:00') AS DATE)
           AND sch.ExamTime > CAST(SWITCHOFFSET(SYSDATETIMEOFFSET(), N'+08:00') AS TIME)))
ORDER BY sch.ExamDate ASC, sch.ExamTime ASC;";

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
       sch.Venue, sel.SelectedAt, sel.IsPermitReleased, sel.PermitReleasedAt,
       sel.ExamType, sel.ExamFee, sel.InvoiceNumber,
       u.FirstName, u.LastName, app.PreviousSchool, app.Department, app.CourseAppliedFor, app.ApplicationSeq, app.AppSubmittedAt
FROM dbo.ExamScheduleSelections sel
JOIN dbo.ExamSchedules sch ON sch.ExamScheduleId = sel.ExamScheduleId
JOIN dbo.Users u ON u.UserId = sel.UserId
OUTER APPLY (
    SELECT TOP (1) aa.PreviousSchool, aa.Department, aa.CourseAppliedFor, aa.ApplicationSeq, aa.SubmittedAt AS AppSubmittedAt
    FROM dbo.AdmissionApplications aa
    WHERE aa.UserId = sel.UserId
    ORDER BY aa.SubmittedAt DESC
) app
WHERE sel.UserId = @UserId;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? MapSelection(reader) : null;
    }

    public async Task<ExamScheduleSelection> SelectAsync(Guid userId, int examScheduleId, string examType, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var transaction = (SqlTransaction)await connection.BeginTransactionAsync(cancellationToken);

        try
        {
            await EnsureSelectableAsync(connection, transaction, userId, examScheduleId, cancellationToken);

            const string upsertSql = @"
MERGE dbo.ExamScheduleSelections AS target
USING (SELECT @UserId AS UserId) AS source
ON target.UserId = source.UserId
WHEN MATCHED THEN
    UPDATE SET ExamScheduleId = @ExamScheduleId, ExamType = @ExamType, ExamStatus = N'Scheduled', SelectedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
    INSERT (UserId, ExamScheduleId, ExamType)
    VALUES (@UserId, @ExamScheduleId, @ExamType);";

            await using (var upsertCommand = new SqlCommand(upsertSql, connection, transaction))
            {
                upsertCommand.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
                upsertCommand.Parameters.Add(new SqlParameter("@ExamScheduleId", SqlDbType.Int) { Value = examScheduleId });
                upsertCommand.Parameters.Add(new SqlParameter("@ExamType", SqlDbType.NVarChar, 40) { Value = examType });
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
        SqlConnection connection, SqlTransaction transaction, Guid userId, int examScheduleId, CancellationToken cancellationToken)
    {
        // UPDLOCK on the slot row serializes two applicants taking the last seat.
        const string sql = @"
SELECT IsOffered, Capacity, ExamDate, ExamTime,
       CAST(SWITCHOFFSET(SYSDATETIMEOFFSET(), N'+08:00') AS DATE) AS Today,
       CAST(SWITCHOFFSET(SYSDATETIMEOFFSET(), N'+08:00') AS TIME) AS NowTime,
       (SELECT COUNT(*) FROM dbo.ExamScheduleSelections sel
        WHERE sel.ExamScheduleId = @ExamScheduleId AND sel.UserId <> @UserId AND sel.ExamStatus IN (N'Scheduled', N'ExamDone')) AS Taken
FROM dbo.ExamSchedules WITH (UPDLOCK, ROWLOCK)
WHERE ExamScheduleId = @ExamScheduleId;";
        await using var command = new SqlCommand(sql, connection, transaction);
        command.Parameters.Add(new SqlParameter("@ExamScheduleId", SqlDbType.Int) { Value = examScheduleId });
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new ExamScheduleNotFoundException(examScheduleId);
        }

        if (!reader.GetBoolean(reader.GetOrdinal("IsOffered")))
        {
            throw new ExamScheduleNotAvailableException("This exam date is not being offered. Choose an available date.");
        }

        var examDate = reader.GetDateTime(reader.GetOrdinal("ExamDate"));
        var today = reader.GetDateTime(reader.GetOrdinal("Today"));
        var hasStarted = examDate < today
            || (examDate == today && reader.GetTimeSpan(reader.GetOrdinal("ExamTime")) <= reader.GetTimeSpan(reader.GetOrdinal("NowTime")));
        if (hasStarted)
        {
            throw new ExamScheduleNotAvailableException("This exam time has already passed. Choose a later slot.");
        }

        if (!reader.IsDBNull(reader.GetOrdinal("Capacity")) && reader.GetInt32(reader.GetOrdinal("Taken")) >= reader.GetInt32(reader.GetOrdinal("Capacity")))
        {
            throw new ExamScheduleNotAvailableException("That time slot is already full. Choose another.");
        }
    }

    public async Task<ExamSchedule> CreateAsync(
        DateOnly examDate,
        TimeOnly examTime,
        bool isOffered,
        int? capacity,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        // Venue is no longer part of an exam schedule, but the column is still NOT NULL
        // in databases created before it was removed, so new slots store an empty one.
        const string sql = @"
INSERT INTO dbo.ExamSchedules (DayType, ExamDate, ExamTime, Venue, IsOffered, Capacity)
OUTPUT inserted.ExamScheduleId, inserted.DayType, inserted.ExamDate, inserted.ExamTime, inserted.Venue, inserted.IsOffered, inserted.Capacity
VALUES (@DayType, @ExamDate, @ExamTime, N'', @IsOffered, @Capacity);";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@DayType", SqlDbType.NVarChar, 10) { Value = examDate.DayOfWeek == DayOfWeek.Saturday ? "Saturday" : "Weekday" });
        command.Parameters.Add(new SqlParameter("@ExamDate", SqlDbType.Date) { Value = examDate.ToDateTime(TimeOnly.MinValue) });
        command.Parameters.Add(new SqlParameter("@ExamTime", SqlDbType.Time) { Value = examTime.ToTimeSpan() });
        command.Parameters.Add(new SqlParameter("@IsOffered", SqlDbType.Bit) { Value = isOffered });
        command.Parameters.Add(new SqlParameter("@Capacity", SqlDbType.Int) { Value = (object?)capacity ?? DBNull.Value });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);
        return MapSchedule(reader);
    }

    public async Task<bool> SlotExistsAsync(DateOnly examDate, TimeOnly examTime, int? exceptExamScheduleId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT COUNT(*) FROM dbo.ExamSchedules
WHERE ExamDate = @ExamDate AND ExamTime = @ExamTime AND (@Except IS NULL OR ExamScheduleId <> @Except);";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@ExamDate", SqlDbType.Date) { Value = examDate.ToDateTime(TimeOnly.MinValue) });
        command.Parameters.Add(new SqlParameter("@ExamTime", SqlDbType.Time) { Value = examTime.ToTimeSpan() });
        command.Parameters.Add(new SqlParameter("@Except", SqlDbType.Int) { Value = (object?)exceptExamScheduleId ?? DBNull.Value });
        return (int)(await command.ExecuteScalarAsync(cancellationToken))! > 0;
    }

    public async Task<int> SetOfferedForDateAsync(DateOnly examDate, bool isOffered, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = "UPDATE dbo.ExamSchedules SET IsOffered = @IsOffered WHERE ExamDate = @ExamDate;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@IsOffered", SqlDbType.Bit) { Value = isOffered });
        command.Parameters.Add(new SqlParameter("@ExamDate", SqlDbType.Date) { Value = examDate.ToDateTime(TimeOnly.MinValue) });
        return await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<ExamSchedule?> UpdateAsync(int examScheduleId, TimeOnly examTime, int? capacity, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var transaction = (SqlTransaction)await connection.BeginTransactionAsync(cancellationToken);

        try
        {
            // Locking the slot row keeps a booking from slipping in between the seat check and the update.
            const string takenSql = @"
SELECT (SELECT COUNT(*) FROM dbo.ExamScheduleSelections sel
        WHERE sel.ExamScheduleId = @ExamScheduleId AND sel.ExamStatus IN (N'Scheduled', N'ExamDone'))
FROM dbo.ExamSchedules WITH (UPDLOCK, ROWLOCK)
WHERE ExamScheduleId = @ExamScheduleId;";

            int? taken;
            await using (var takenCommand = new SqlCommand(takenSql, connection, transaction))
            {
                takenCommand.Parameters.Add(new SqlParameter("@ExamScheduleId", SqlDbType.Int) { Value = examScheduleId });
                var scalar = await takenCommand.ExecuteScalarAsync(cancellationToken);
                taken = scalar is null or DBNull ? null : (int)scalar;
            }

            if (taken is null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return null;
            }

            if (capacity is not null && capacity < taken)
            {
                throw new ExamScheduleConflictException(
                    $"{taken} applicant{(taken == 1 ? " has" : "s have")} already booked this slot, so it can't hold fewer than {taken}.");
            }

            const string updateSql = @"
UPDATE dbo.ExamSchedules
SET ExamTime = @ExamTime, Capacity = @Capacity
OUTPUT inserted.ExamScheduleId, inserted.DayType, inserted.ExamDate, inserted.ExamTime, inserted.Venue, inserted.IsOffered, inserted.Capacity
WHERE ExamScheduleId = @ExamScheduleId;";

            ExamSchedule? updated;
            await using (var command = new SqlCommand(updateSql, connection, transaction))
            {
                command.Parameters.Add(new SqlParameter("@ExamTime", SqlDbType.Time) { Value = examTime.ToTimeSpan() });
                command.Parameters.Add(new SqlParameter("@Capacity", SqlDbType.Int) { Value = (object?)capacity ?? DBNull.Value });
                command.Parameters.Add(new SqlParameter("@ExamScheduleId", SqlDbType.Int) { Value = examScheduleId });
                await using var reader = await command.ExecuteReaderAsync(cancellationToken);
                updated = await reader.ReadAsync(cancellationToken) ? MapSchedule(reader) : null;
            }

            await transaction.CommitAsync(cancellationToken);
            return updated;
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
    }

    public async Task<bool> DeleteAsync(int examScheduleId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var transaction = (SqlTransaction)await connection.BeginTransactionAsync(cancellationToken);

        try
        {
            const string countSql = @"
SELECT (SELECT COUNT(*) FROM dbo.ExamScheduleSelections sel WHERE sel.ExamScheduleId = @ExamScheduleId)
FROM dbo.ExamSchedules WITH (UPDLOCK, ROWLOCK)
WHERE ExamScheduleId = @ExamScheduleId;";

            int? booked;
            await using (var countCommand = new SqlCommand(countSql, connection, transaction))
            {
                countCommand.Parameters.Add(new SqlParameter("@ExamScheduleId", SqlDbType.Int) { Value = examScheduleId });
                var scalar = await countCommand.ExecuteScalarAsync(cancellationToken);
                booked = scalar is null or DBNull ? null : (int)scalar;
            }

            if (booked is null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return false;
            }

            if (booked > 0)
            {
                throw new ExamScheduleConflictException(
                    $"{booked} applicant{(booked == 1 ? " has" : "s have")} booked this slot. Move them to another slot first, or mark the date as not offered.");
            }

            await using (var deleteCommand = new SqlCommand("DELETE FROM dbo.ExamSchedules WHERE ExamScheduleId = @ExamScheduleId;", connection, transaction))
            {
                deleteCommand.Parameters.Add(new SqlParameter("@ExamScheduleId", SqlDbType.Int) { Value = examScheduleId });
                await deleteCommand.ExecuteNonQueryAsync(cancellationToken);
            }

            await transaction.CommitAsync(cancellationToken);
            return true;
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
    }

    public async Task<ExamSchedule?> SetOfferedAsync(int examScheduleId, bool isOffered, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
UPDATE dbo.ExamSchedules
SET IsOffered = @IsOffered
OUTPUT inserted.ExamScheduleId, inserted.DayType, inserted.ExamDate, inserted.ExamTime, inserted.Venue, inserted.IsOffered, inserted.Capacity
WHERE ExamScheduleId = @ExamScheduleId;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@IsOffered", SqlDbType.Bit) { Value = isOffered });
        command.Parameters.Add(new SqlParameter("@ExamScheduleId", SqlDbType.Int) { Value = examScheduleId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? MapSchedule(reader) : null;
    }

    public async Task<ExamSchedule?> SetCapacityAsync(int examScheduleId, int? capacity, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
UPDATE dbo.ExamSchedules
SET Capacity = @Capacity
OUTPUT inserted.ExamScheduleId, inserted.DayType, inserted.ExamDate, inserted.ExamTime, inserted.Venue, inserted.IsOffered, inserted.Capacity
WHERE ExamScheduleId = @ExamScheduleId;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Capacity", SqlDbType.Int) { Value = (object?)capacity ?? DBNull.Value });
        command.Parameters.Add(new SqlParameter("@ExamScheduleId", SqlDbType.Int) { Value = examScheduleId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? MapSchedule(reader) : null;
    }

    public async Task<bool> DeleteSelectionAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        await using var command = new SqlCommand("DELETE FROM dbo.ExamScheduleSelections WHERE UserId = @UserId;", connection);
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
        return await command.ExecuteNonQueryAsync(cancellationToken) > 0;
    }

    public async Task<IReadOnlyList<AdminExamSchedule>> GetAllWithApplicantsAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        var schedules = new Dictionary<int, AdminExamSchedule>();
        var applicantsBySchedule = new Dictionary<int, List<AssignedApplicant>>();

        const string schedulesSql = @"
SELECT ExamScheduleId, DayType, ExamDate, ExamTime, Venue, IsOffered, Capacity
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
                    IsOffered = schedule.IsOffered,
                    Capacity = schedule.Capacity,
                };
                applicantsBySchedule[schedule.ExamScheduleId] = new List<AssignedApplicant>();
            }
        }

        const string applicantsSql = @"
SELECT sel.ExamScheduleId, sel.UserId, u.FirstName, u.LastName, u.Email, sel.SelectedAt, sel.ExamStatus, sel.ExamType
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
                    ExamStatus = reader.GetString(reader.GetOrdinal("ExamStatus")),
                    ExamType = reader.GetString(reader.GetOrdinal("ExamType")),
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
        Capacity = reader.IsDBNull(reader.GetOrdinal("Capacity")) ? null : reader.GetInt32(reader.GetOrdinal("Capacity")),
        Taken = HasColumn(reader, "Taken") ? reader.GetInt32(reader.GetOrdinal("Taken")) : 0,
    };

    private static bool HasColumn(SqlDataReader reader, string name)
    {
        for (var i = 0; i < reader.FieldCount; i++)
        {
            if (string.Equals(reader.GetName(i), name, StringComparison.OrdinalIgnoreCase)) return true;
        }

        return false;
    }

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
        ApplicantName = $"{reader.GetString(reader.GetOrdinal("FirstName"))} {reader.GetString(reader.GetOrdinal("LastName"))}",
        ExamType = reader.GetString(reader.GetOrdinal("ExamType")),
        ExamFee = reader.IsDBNull(reader.GetOrdinal("ExamFee")) ? null : reader.GetDecimal(reader.GetOrdinal("ExamFee")),
        InvoiceNumber = reader.IsDBNull(reader.GetOrdinal("InvoiceNumber")) ? null : reader.GetString(reader.GetOrdinal("InvoiceNumber")),
        SchoolLastAttended = reader.IsDBNull(reader.GetOrdinal("PreviousSchool")) ? null : reader.GetString(reader.GetOrdinal("PreviousSchool")),
        LevelApplying = reader.IsDBNull(reader.GetOrdinal("Department")) ? null : reader.GetString(reader.GetOrdinal("Department")),
        Program = reader.IsDBNull(reader.GetOrdinal("CourseAppliedFor")) ? null : reader.GetString(reader.GetOrdinal("CourseAppliedFor")),
        ApplicationNumber = reader.IsDBNull(reader.GetOrdinal("ApplicationSeq"))
            ? null
            : Constants.ApplicationNumbers.Format(reader.GetInt32(reader.GetOrdinal("ApplicationSeq")), reader.GetDateTime(reader.GetOrdinal("AppSubmittedAt"))),
    };

    public async Task<IReadOnlyList<AdminExamPermitCandidate>> GetAllSelectionsWithApplicantsAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT sel.ExamScheduleSelectionId, sel.UserId, u.FirstName, u.LastName, u.Email,
       sel.ExamScheduleId, sch.DayType, sch.ExamDate, sch.ExamTime, sch.Venue,
       sel.SelectedAt, sel.IsPermitReleased, sel.PermitReleasedAt,
       sel.ExamType, sel.ExamFee, sel.InvoiceNumber,
       app.PreviousSchool, app.Department, app.CourseAppliedFor
FROM dbo.ExamScheduleSelections sel
JOIN dbo.ExamSchedules sch ON sch.ExamScheduleId = sel.ExamScheduleId
JOIN dbo.Users u ON u.UserId = sel.UserId
OUTER APPLY (
    SELECT TOP (1) aa.PreviousSchool, aa.Department, aa.CourseAppliedFor
    FROM dbo.AdmissionApplications aa
    WHERE aa.UserId = sel.UserId
    ORDER BY aa.SubmittedAt DESC
) app
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

    public async Task<bool> SetExamStatusAsync(Guid userId, string examStatus, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = "UPDATE dbo.ExamScheduleSelections SET ExamStatus = @ExamStatus WHERE UserId = @UserId;";
        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
        command.Parameters.Add(new SqlParameter("@ExamStatus", SqlDbType.NVarChar, 30) { Value = examStatus });
        return await command.ExecuteNonQueryAsync(cancellationToken) > 0;
    }

    public async Task<AdminExamPermitCandidate?> GetPermitCandidateByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT sel.ExamScheduleSelectionId, sel.UserId, u.FirstName, u.LastName, u.Email,
       sel.ExamScheduleId, sch.DayType, sch.ExamDate, sch.ExamTime, sch.Venue,
       sel.SelectedAt, sel.IsPermitReleased, sel.PermitReleasedAt,
       sel.ExamType, sel.ExamFee, sel.InvoiceNumber,
       app.PreviousSchool, app.Department, app.CourseAppliedFor
FROM dbo.ExamScheduleSelections sel
JOIN dbo.ExamSchedules sch ON sch.ExamScheduleId = sel.ExamScheduleId
JOIN dbo.Users u ON u.UserId = sel.UserId
OUTER APPLY (
    SELECT TOP (1) aa.PreviousSchool, aa.Department, aa.CourseAppliedFor
    FROM dbo.AdmissionApplications aa
    WHERE aa.UserId = sel.UserId
    ORDER BY aa.SubmittedAt DESC
) app
WHERE sel.UserId = @UserId;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? MapCandidate(reader) : null;
    }

    public async Task<AdminExamPermitCandidate?> ReleasePermitAsync(Guid userId, Guid releasedByUserId, decimal examFee, string? invoiceNumber, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        // A no-op UPDATE (0 rows) when there's no selection, or when the
        // permit is already released - either way the read below reports
        // the current state.
        const string updateSql = @"
UPDATE dbo.ExamScheduleSelections
SET IsPermitReleased = 1, PermitReleasedAt = SYSUTCDATETIME(), PermitReleasedByUserId = @ReleasedByUserId,
    ExamFee = @ExamFee, InvoiceNumber = @InvoiceNumber
WHERE UserId = @UserId AND IsPermitReleased = 0;";

        await using (var command = new SqlCommand(updateSql, connection))
        {
            command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
            command.Parameters.Add(new SqlParameter("@ReleasedByUserId", SqlDbType.UniqueIdentifier) { Value = releasedByUserId });
            command.Parameters.Add(new SqlParameter("@ExamFee", SqlDbType.Decimal) { Precision = 10, Scale = 2, Value = examFee });
            command.Parameters.Add(new SqlParameter("@InvoiceNumber", SqlDbType.NVarChar, 50) { Value = (object?)invoiceNumber ?? DBNull.Value });
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
        ExamType = reader.GetString(reader.GetOrdinal("ExamType")),
        ExamFee = reader.IsDBNull(reader.GetOrdinal("ExamFee")) ? null : reader.GetDecimal(reader.GetOrdinal("ExamFee")),
        InvoiceNumber = reader.IsDBNull(reader.GetOrdinal("InvoiceNumber")) ? null : reader.GetString(reader.GetOrdinal("InvoiceNumber")),
        SchoolLastAttended = reader.IsDBNull(reader.GetOrdinal("PreviousSchool")) ? null : reader.GetString(reader.GetOrdinal("PreviousSchool")),
        LevelApplying = reader.IsDBNull(reader.GetOrdinal("Department")) ? null : reader.GetString(reader.GetOrdinal("Department")),
        Program = reader.IsDBNull(reader.GetOrdinal("CourseAppliedFor")) ? null : reader.GetString(reader.GetOrdinal("CourseAppliedFor")),
    };
}
