namespace BCAS.Api.Models;

public class Announcement
{
    public int AnnouncementId { get; set; }

    /// <summary>Admission or Scholarship.</summary>
    public string Category { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime PostedAt { get; set; }
}
