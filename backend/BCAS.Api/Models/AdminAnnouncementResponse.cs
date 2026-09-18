namespace BCAS.Api.Models;

/// <summary>An announcement with its posted/draft status included (BISAASS-36, Admin-only).</summary>
public class AdminAnnouncementResponse
{
    public int AnnouncementId { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime PostedAt { get; set; }
}
