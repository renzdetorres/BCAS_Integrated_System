namespace BCAS.Api.Models;

public class NotificationTriggerConfigResponse
{
    public string TriggerKey { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
    public DateTime UpdatedAt { get; set; }
}
