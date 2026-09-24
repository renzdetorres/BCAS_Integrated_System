namespace BCAS.Api.Models;

/// <summary>A lightweight applicant inquiry thread - see the schema.sql comment on InquiryThreads/InquiryMessages.</summary>
public class InquiryThread
{
    public Guid ThreadId { get; set; }
    public Guid UserId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public bool HasUnreadForApplicant { get; set; }
    public bool HasUnreadForStaff { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    /// <summary>Null only if somehow no message exists yet - never true in practice, since a thread is always created with its first message.</summary>
    public string? LastMessagePreview { get; set; }
    public int MessageCount { get; set; }
}
