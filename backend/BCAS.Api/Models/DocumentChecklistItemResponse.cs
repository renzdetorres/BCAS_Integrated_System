namespace BCAS.Api.Models;

public class DocumentChecklistItemResponse
{
    public string DocumentType { get; set; } = string.Empty;

    /// <summary>NotSubmitted, Pending, Verified, Rejected, or Flagged.</summary>
    public string Status { get; set; } = "NotSubmitted";

    public string? FileName { get; set; }
    public DateTime? UploadedAt { get; set; }
    public string? FlaggedReason { get; set; }
}
