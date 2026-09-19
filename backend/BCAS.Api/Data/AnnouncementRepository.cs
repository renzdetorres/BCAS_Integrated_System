using System.Data;
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

        const string sql = SelectColumns + @"
FROM dbo.Announcements
WHERE IsActive = 1
ORDER BY PostedAt DESC;";

        await using var command = new SqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var announcements = new List<Announcement>();
        while (await reader.ReadAsync(cancellationToken))
        {
            announcements.Add(MapAnnouncement(reader));
        }

        return announcements;
    }

    public async Task<IReadOnlyList<Announcement>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = SelectColumns + @"
FROM dbo.Announcements
ORDER BY PostedAt DESC;";

        await using var command = new SqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var announcements = new List<Announcement>();
        while (await reader.ReadAsync(cancellationToken))
        {
            announcements.Add(MapAnnouncement(reader));
        }

        return announcements;
    }

    public async Task<Announcement> CreateAsync(
        string category, string title, string body, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
INSERT INTO dbo.Announcements (Category, Title, Body, IsActive)
" + OutputColumns + @"
VALUES (@Category, @Title, @Body, 0);";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Category", SqlDbType.NVarChar, 20) { Value = category });
        command.Parameters.Add(new SqlParameter("@Title", SqlDbType.NVarChar, 200) { Value = title });
        command.Parameters.Add(new SqlParameter("@Body", SqlDbType.NVarChar, 2000) { Value = body });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);
        return MapAnnouncement(reader);
    }

    public async Task<(Announcement? Announcement, bool WasActive)> SetActiveStatusAsync(
        int announcementId, bool isActive, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        // WasActive (the pre-update value, via the OUTPUT clause's deleted
        // pseudo-table) rides along on the same atomic UPDATE, rather than
        // a separate SELECT beforehand - the only way to tell "newly
        // posted" from "already active" without a race between two
        // concurrent calls (e.g. a double-clicked Post button) both seeing
        // "not yet active" and both broadcasting the announcement email.
        const string sql = @"
UPDATE dbo.Announcements
SET IsActive = @IsActive
OUTPUT deleted.IsActive AS WasActive, inserted.AnnouncementId, inserted.Category, inserted.Title, inserted.Body, inserted.IsActive, inserted.PostedAt
WHERE AnnouncementId = @AnnouncementId;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@IsActive", SqlDbType.Bit) { Value = isActive });
        command.Parameters.Add(new SqlParameter("@AnnouncementId", SqlDbType.Int) { Value = announcementId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return (null, false);
        }

        var wasActive = reader.GetBoolean(reader.GetOrdinal("WasActive"));
        return (MapAnnouncement(reader), wasActive);
    }

    private const string SelectColumns = "SELECT AnnouncementId, Category, Title, Body, IsActive, PostedAt";

    private const string OutputColumns =
        "OUTPUT inserted.AnnouncementId, inserted.Category, inserted.Title, inserted.Body, inserted.IsActive, inserted.PostedAt";

    private static Announcement MapAnnouncement(SqlDataReader reader) => new()
    {
        AnnouncementId = reader.GetInt32(reader.GetOrdinal("AnnouncementId")),
        Category = reader.GetString(reader.GetOrdinal("Category")),
        Title = reader.GetString(reader.GetOrdinal("Title")),
        Body = reader.GetString(reader.GetOrdinal("Body")),
        IsActive = reader.GetBoolean(reader.GetOrdinal("IsActive")),
        PostedAt = reader.GetDateTime(reader.GetOrdinal("PostedAt")),
    };
}
