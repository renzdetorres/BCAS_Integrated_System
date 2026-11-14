namespace BCAS.Api.Models;

public class AdminDocumentListItemResponse
{
    public Guid DocumentId { get; set; }
    public Guid UserId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public string DocumentType { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;

    /// <summary>Pending, Verified, Rejected, or Flagged.</summary>
    public string Status { get; set; } = string.Empty;

    /// <summary>Reason given for a Flagged or Rejected document; null otherwise.</summary>
    public string? FlaggedReason { get; set; }
    public DateTime UploadedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    /// <summary>Name of the staff member who last reviewed this document (BISAASS-52); null if never reviewed.</summary>
    public string? ReviewedByName { get; set; }
    public DateTime? ReviewedAt { get; set; }

    /// <summary>
    /// Which kind of application the applicant has on file, so a reviewer can tell what a document is for (the
    /// report card and ID picture are shared). Filled in by the Document Verification queue; false elsewhere.
    /// </summary>
    public bool HasAdmissionApplication { get; set; }
    public bool HasScholarshipApplication { get; set; }
}
