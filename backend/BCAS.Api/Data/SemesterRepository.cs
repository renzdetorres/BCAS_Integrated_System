using System.Data;
using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class SemesterRepository : ISemesterRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public SemesterRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<Semester>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT SemesterId, Name, StartDate, EndDate
FROM dbo.Semesters
ORDER BY StartDate DESC;";

        await using var command = new SqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var semesters = new List<Semester>();
        while (await reader.ReadAsync(cancellationToken))
        {
            semesters.Add(Map(reader));
        }

        return semesters;
    }

    public async Task<Semester?> GetOngoingAsync(DateOnly date, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT TOP 1 SemesterId, Name, StartDate, EndDate
FROM dbo.Semesters
WHERE @Date BETWEEN StartDate AND EndDate
ORDER BY StartDate DESC;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Date", SqlDbType.Date) { Value = date.ToDateTime(TimeOnly.MinValue) });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? Map(reader) : null;
    }

    public async Task<bool> OverlapsAsync(DateOnly start, DateOnly end, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT CASE WHEN EXISTS (
    SELECT 1 FROM dbo.Semesters WHERE StartDate <= @End AND EndDate >= @Start
) THEN 1 ELSE 0 END;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Start", SqlDbType.Date) { Value = start.ToDateTime(TimeOnly.MinValue) });
        command.Parameters.Add(new SqlParameter("@End", SqlDbType.Date) { Value = end.ToDateTime(TimeOnly.MinValue) });
        return (int)(await command.ExecuteScalarAsync(cancellationToken))! == 1;
    }

    public async Task<Semester> CreateAsync(
        string name, DateOnly start, DateOnly end, Guid createdByUserId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
INSERT INTO dbo.Semesters (Name, StartDate, EndDate, CreatedByUserId)
OUTPUT inserted.SemesterId, inserted.Name, inserted.StartDate, inserted.EndDate
VALUES (@Name, @Start, @End, @CreatedBy);";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Name", SqlDbType.NVarChar, 100) { Value = name });
        command.Parameters.Add(new SqlParameter("@Start", SqlDbType.Date) { Value = start.ToDateTime(TimeOnly.MinValue) });
        command.Parameters.Add(new SqlParameter("@End", SqlDbType.Date) { Value = end.ToDateTime(TimeOnly.MinValue) });
        command.Parameters.Add(new SqlParameter("@CreatedBy", SqlDbType.UniqueIdentifier) { Value = createdByUserId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);
        return Map(reader);
    }

    public async Task<bool> DeleteAsync(int semesterId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        await using var command = new SqlCommand("DELETE FROM dbo.Semesters WHERE SemesterId = @Id;", connection);
        command.Parameters.Add(new SqlParameter("@Id", SqlDbType.Int) { Value = semesterId });
        return await command.ExecuteNonQueryAsync(cancellationToken) > 0;
    }

    private static Semester Map(SqlDataReader reader) => new()
    {
        SemesterId = reader.GetInt32(reader.GetOrdinal("SemesterId")),
        Name = reader.GetString(reader.GetOrdinal("Name")),
        StartDate = DateOnly.FromDateTime(reader.GetDateTime(reader.GetOrdinal("StartDate"))),
        EndDate = DateOnly.FromDateTime(reader.GetDateTime(reader.GetOrdinal("EndDate"))),
    };
}
