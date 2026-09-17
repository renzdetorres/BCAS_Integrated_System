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

        const string sql = @"
SELECT ScholarshipId, Name, ScholarshipType, TotalSlots, RemainingSlots, IsActive
FROM dbo.Scholarships
WHERE IsActive = 1 AND RemainingSlots > 0
ORDER BY Name ASC;";

        await using var command = new SqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var scholarships = new List<Scholarship>();
        while (await reader.ReadAsync(cancellationToken))
        {
            scholarships.Add(new Scholarship
            {
                ScholarshipId = reader.GetInt32(reader.GetOrdinal("ScholarshipId")),
                Name = reader.GetString(reader.GetOrdinal("Name")),
                ScholarshipType = reader.GetString(reader.GetOrdinal("ScholarshipType")),
                TotalSlots = reader.GetInt32(reader.GetOrdinal("TotalSlots")),
                RemainingSlots = reader.GetInt32(reader.GetOrdinal("RemainingSlots")),
                IsActive = reader.GetBoolean(reader.GetOrdinal("IsActive")),
            });
        }

        return scholarships;
    }
}
