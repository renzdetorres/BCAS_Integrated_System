using System.Data;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public interface IAdmissionSlotsRepository
{
    /// <summary>
    /// How many applications take a slot, by academic category and level: the academic year's active applications
    /// (not archived, rejected or retracted).
    /// </summary>
    Task<IReadOnlyDictionary<(string Category, string Level), int>> GetTakenAsync(string academicYear, CancellationToken cancellationToken = default);
}

public class AdmissionSlotsRepository : IAdmissionSlotsRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public AdmissionSlotsRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyDictionary<(string Category, string Level), int>> GetTakenAsync(string academicYear, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT Department, YearLevel, COUNT(*) AS Total
FROM dbo.AdmissionApplications
WHERE IsArchived = 0
  AND Department IS NOT NULL AND YearLevel IS NOT NULL
  AND Status NOT IN (N'Rejected', N'Retracted')
  AND AcademicYear = @AcademicYear
GROUP BY Department, YearLevel;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@AcademicYear", SqlDbType.NVarChar, 9) { Value = academicYear });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var taken = new Dictionary<(string, string), int>();
        while (await reader.ReadAsync(cancellationToken))
        {
            taken[(reader.GetString(0), reader.GetString(1))] = reader.GetInt32(2);
        }

        return taken;
    }
}
