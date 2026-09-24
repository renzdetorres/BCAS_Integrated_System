using System.Data;
using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class ScholarshipRepository : IScholarshipRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public ScholarshipRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<Scholarship>> GetAvailableAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = SelectColumns + @"
FROM dbo.Scholarships
WHERE IsActive = 1
ORDER BY CASE WHEN RemainingSlots > 0 THEN 0 ELSE 1 END, Name ASC;";

        await using var command = new SqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var scholarships = new List<Scholarship>();
        while (await reader.ReadAsync(cancellationToken))
        {
            scholarships.Add(MapScholarship(reader));
        }

        return scholarships;
    }

    public async Task<IReadOnlyList<Scholarship>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = SelectColumns + @"
FROM dbo.Scholarships
ORDER BY Name ASC;";

        await using var command = new SqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var scholarships = new List<Scholarship>();
        while (await reader.ReadAsync(cancellationToken))
        {
            scholarships.Add(MapScholarship(reader));
        }

        return scholarships;
    }

    public async Task<Scholarship?> GetByIdAsync(int scholarshipId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = SelectColumns + @"
FROM dbo.Scholarships
WHERE ScholarshipId = @ScholarshipId;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@ScholarshipId", SqlDbType.Int) { Value = scholarshipId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? MapScholarship(reader) : null;
    }

    public async Task<Scholarship> CreateAsync(
        string name,
        string scholarshipType,
        int totalSlots,
        decimal? minimumGradeAverage,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
INSERT INTO dbo.Scholarships (Name, ScholarshipType, TotalSlots, RemainingSlots, MinimumGradeAverage)
" + OutputColumns + @"
VALUES (@Name, @ScholarshipType, @TotalSlots, @TotalSlots, @MinimumGradeAverage);";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Name", SqlDbType.NVarChar, 200) { Value = name });
        command.Parameters.Add(new SqlParameter("@ScholarshipType", SqlDbType.NVarChar, 100) { Value = scholarshipType });
        command.Parameters.Add(new SqlParameter("@TotalSlots", SqlDbType.Int) { Value = totalSlots });
        command.Parameters.Add(new SqlParameter("@MinimumGradeAverage", SqlDbType.Decimal) { Value = (object?)minimumGradeAverage ?? DBNull.Value });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);
        return MapScholarship(reader);
    }

    public async Task<Scholarship?> UpdateAsync(
        int scholarshipId,
        string name,
        string scholarshipType,
        int totalSlots,
        decimal? minimumGradeAverage,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        // RemainingSlots + (@TotalSlots - TotalSlots) reads TotalSlots'
        // pre-update value (SQL Server evaluates every SET expression
        // against the row as it was before this statement), so occupied
        // slots (TotalSlots - RemainingSlots) come out unchanged.
        const string sql = @"
UPDATE dbo.Scholarships
SET Name = @Name,
    ScholarshipType = @ScholarshipType,
    RemainingSlots = RemainingSlots + (@TotalSlots - TotalSlots),
    TotalSlots = @TotalSlots,
    MinimumGradeAverage = @MinimumGradeAverage
" + OutputColumns + @"
WHERE ScholarshipId = @ScholarshipId;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Name", SqlDbType.NVarChar, 200) { Value = name });
        command.Parameters.Add(new SqlParameter("@ScholarshipType", SqlDbType.NVarChar, 100) { Value = scholarshipType });
        command.Parameters.Add(new SqlParameter("@TotalSlots", SqlDbType.Int) { Value = totalSlots });
        command.Parameters.Add(new SqlParameter("@MinimumGradeAverage", SqlDbType.Decimal) { Value = (object?)minimumGradeAverage ?? DBNull.Value });
        command.Parameters.Add(new SqlParameter("@ScholarshipId", SqlDbType.Int) { Value = scholarshipId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? MapScholarship(reader) : null;
    }

    public async Task<Scholarship?> SetActiveStatusAsync(int scholarshipId, bool isActive, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
UPDATE dbo.Scholarships
SET IsActive = @IsActive
" + OutputColumns + @"
WHERE ScholarshipId = @ScholarshipId;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@IsActive", SqlDbType.Bit) { Value = isActive });
        command.Parameters.Add(new SqlParameter("@ScholarshipId", SqlDbType.Int) { Value = scholarshipId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? MapScholarship(reader) : null;
    }

    private const string SelectColumns =
        "SELECT ScholarshipId, Name, ScholarshipType, TotalSlots, RemainingSlots, IsActive, MinimumGradeAverage, IsTopOne, CreatedAt";

    private const string OutputColumns = @"
OUTPUT inserted.ScholarshipId, inserted.Name, inserted.ScholarshipType, inserted.TotalSlots, inserted.RemainingSlots,
       inserted.IsActive, inserted.MinimumGradeAverage, inserted.IsTopOne, inserted.CreatedAt";

    private static Scholarship MapScholarship(SqlDataReader reader) => new()
    {
        ScholarshipId = reader.GetInt32(reader.GetOrdinal("ScholarshipId")),
        Name = reader.GetString(reader.GetOrdinal("Name")),
        ScholarshipType = reader.GetString(reader.GetOrdinal("ScholarshipType")),
        TotalSlots = reader.GetInt32(reader.GetOrdinal("TotalSlots")),
        RemainingSlots = reader.GetInt32(reader.GetOrdinal("RemainingSlots")),
        IsActive = reader.GetBoolean(reader.GetOrdinal("IsActive")),
        MinimumGradeAverage = reader.IsDBNull(reader.GetOrdinal("MinimumGradeAverage")) ? null : reader.GetDecimal(reader.GetOrdinal("MinimumGradeAverage")),
        IsTopOne = reader.GetBoolean(reader.GetOrdinal("IsTopOne")),
        CreatedAt = reader.GetDateTime(reader.GetOrdinal("CreatedAt")),
    };
}
