namespace BCAS.Api.Models;

/// <summary>One row in either the applicant's own inquiry list or the staff queue - HasUnread is already resolved to the right side's perspective by the service layer.</summary>
public class InquiryThreadSummaryResponse
{
    public Guid ThreadId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public bool HasUnread { get; set; }
    public string? LastMessagePreview { get; set; }
    public int MessageCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
