namespace BCAS.Api.Models;

/// <summary>One in-app (system) notification in an applicant's inbox.</summary>
public class Notification
{
    public Guid NotificationId { get; set; }
    public Guid UserId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class NotificationResponse
{
    public Guid NotificationId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class NotificationInboxResponse
{
    public int UnreadCount { get; set; }
    public IReadOnlyList<NotificationResponse> Items { get; set; } = Array.Empty<NotificationResponse>();
}
