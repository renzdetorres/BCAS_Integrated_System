namespace BCAS.Api.Models;

public class DocumentChecklistItemResponse
{
    public string DocumentType { get; set; } = string.Empty;

    /// <summary>NotSubmitted, Pending, Verified, Rejected, or Flagged.</summary>
    public string Status { get; set; } = "NotSubmitted";

    public string? FileName { get; set; }
    public DateTime? UploadedAt { get; set; }
    /// <summary>Why the document was rejected or flagged, shown to the applicant.</summary>
    public string? FlaggedReason { get; set; }

    /// <summary>The file formats this document accepts, e.g. ["PDF"] or ["JPG", "PNG"].</summary>
    public IReadOnlyList<string> AcceptedFormats { get; set; } = Array.Empty<string>();
}
