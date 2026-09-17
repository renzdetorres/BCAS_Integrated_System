namespace BCAS.Api.Models;

public class ApplicantDocument
{
    public Guid DocumentId { get; set; }
    public Guid UserId { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public int FileSizeBytes { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? FlaggedReason { get; set; }
    public DateTime UploadedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
