using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class DeadlineRepository : IDeadlineRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public DeadlineRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<Deadline>> GetUpcomingAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT DeadlineId, DeadlineType, Title, DeadlineDate
FROM dbo.Deadlines
WHERE DeadlineDate >= CAST(SYSUTCDATETIME() AS DATE)
ORDER BY DeadlineDate ASC;";

        await using var command = new SqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var deadlines = new List<Deadline>();
        while (await reader.ReadAsync(cancellationToken))
        {
            deadlines.Add(new Deadline
            {
                DeadlineId = reader.GetInt32(reader.GetOrdinal("DeadlineId")),
                DeadlineType = reader.GetString(reader.GetOrdinal("DeadlineType")),
                Title = reader.GetString(reader.GetOrdinal("Title")),
                DeadlineDate = DateOnly.FromDateTime(reader.GetDateTime(reader.GetOrdinal("DeadlineDate"))),
            });
        }

        return deadlines;
    }
}
