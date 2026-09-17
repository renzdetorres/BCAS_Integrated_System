using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class AnnouncementRepository : IAnnouncementRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public AnnouncementRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<Announcement>> GetActiveAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT AnnouncementId, Category, Title, Body, IsActive, PostedAt
FROM dbo.Announcements
WHERE IsActive = 1
ORDER BY PostedAt DESC;";

        await using var command = new SqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var announcements = new List<Announcement>();
        while (await reader.ReadAsync(cancellationToken))
        {
            announcements.Add(new Announcement
            {
                AnnouncementId = reader.GetInt32(reader.GetOrdinal("AnnouncementId")),
                Category = reader.GetString(reader.GetOrdinal("Category")),
                Title = reader.GetString(reader.GetOrdinal("Title")),
                Body = reader.GetString(reader.GetOrdinal("Body")),
                IsActive = reader.GetBoolean(reader.GetOrdinal("IsActive")),
                PostedAt = reader.GetDateTime(reader.GetOrdinal("PostedAt")),
            });
        }

        return announcements;
    }
}
