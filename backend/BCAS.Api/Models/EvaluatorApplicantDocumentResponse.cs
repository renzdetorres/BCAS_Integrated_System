namespace BCAS.Api.Models;

public class EvaluatorApplicantDocumentResponse
{
    public string DocumentType { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? FlaggedReason { get; set; }
    public DateTime UploadedAt { get; set; }
}
