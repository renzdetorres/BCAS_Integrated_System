namespace BCAS.Api.Models;

public class NotificationPreference
{
    public string NotificationType { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
}
