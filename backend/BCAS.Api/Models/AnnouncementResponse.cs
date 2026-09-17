namespace BCAS.Api.Models;

public class AnnouncementResponse
{
    public int AnnouncementId { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public DateTime PostedAt { get; set; }
}
