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
       sch.Venue, sel.SelectedAt
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
    };
}
