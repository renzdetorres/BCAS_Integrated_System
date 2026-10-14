using System.Data;
using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public interface INotificationInboxRepository
{
    Task InsertAsync(Guid userId, string eventType, string title, string body, CancellationToken cancellationToken = default);

    /// <summary>The newest notifications first, plus how many are unread in total.</summary>
    Task<(IReadOnlyList<Notification> Items, int UnreadCount)> GetRecentAsync(Guid userId, int take, CancellationToken cancellationToken = default);

    Task MarkReadAsync(Guid userId, Guid notificationId, CancellationToken cancellationToken = default);

    Task MarkAllReadAsync(Guid userId, CancellationToken cancellationToken = default);
}

public class NotificationInboxRepository : INotificationInboxRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public NotificationInboxRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task InsertAsync(Guid userId, string eventType, string title, string body, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
INSERT INTO dbo.Notifications (UserId, EventType, Title, Body)
VALUES (@UserId, @EventType, @Title, @Body);";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
        command.Parameters.Add(new SqlParameter("@EventType", SqlDbType.NVarChar, 30) { Value = eventType });
        command.Parameters.Add(new SqlParameter("@Title", SqlDbType.NVarChar, 200) { Value = Truncate(title, 200) });
        command.Parameters.Add(new SqlParameter("@Body", SqlDbType.NVarChar, 2000) { Value = Truncate(body, 2000) });
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<(IReadOnlyList<Notification> Items, int UnreadCount)> GetRecentAsync(
        Guid userId, int take, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT TOP (@Take) NotificationId, UserId, EventType, Title, Body, IsRead, CreatedAt
FROM dbo.Notifications
WHERE UserId = @UserId
ORDER BY CreatedAt DESC;

SELECT COUNT(*) FROM dbo.Notifications WHERE UserId = @UserId AND IsRead = 0;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
        command.Parameters.Add(new SqlParameter("@Take", SqlDbType.Int) { Value = take });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var items = new List<Notification>();
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(new Notification
            {
                NotificationId = reader.GetGuid(0),
                UserId = reader.GetGuid(1),
                EventType = reader.GetString(2),
                Title = reader.GetString(3),
                Body = reader.GetString(4),
                IsRead = reader.GetBoolean(5),
                CreatedAt = reader.GetDateTime(6),
            });
        }

        await reader.NextResultAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);
        return (items, reader.GetInt32(0));
    }

    public async Task MarkReadAsync(Guid userId, Guid notificationId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = "UPDATE dbo.Notifications SET IsRead = 1 WHERE NotificationId = @NotificationId AND UserId = @UserId;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@NotificationId", SqlDbType.UniqueIdentifier) { Value = notificationId });
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task MarkAllReadAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = "UPDATE dbo.Notifications SET IsRead = 1 WHERE UserId = @UserId AND IsRead = 0;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static string Truncate(string value, int max) => value.Length <= max ? value : value[..max];
}
