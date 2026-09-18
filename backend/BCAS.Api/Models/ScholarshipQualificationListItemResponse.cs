namespace BCAS.Api.Models;

public class ScholarshipQualificationListItemResponse
{
    public Guid ApplicationId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public string ScholarshipName { get; set; } = string.Empty;
    public string Verdict { get; set; } = string.Empty;
    public string? Remarks { get; set; }
    public string EvaluatedByName { get; set; } = string.Empty;
    public DateTime EvaluatedAt { get; set; }
}
