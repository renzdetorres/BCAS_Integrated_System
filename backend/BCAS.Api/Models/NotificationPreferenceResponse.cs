namespace BCAS.Api.Models;

public class NotificationPreferenceResponse
{
    public string NotificationType { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
}
