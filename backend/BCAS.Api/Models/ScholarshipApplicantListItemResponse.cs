namespace BCAS.Api.Models;

public class ScholarshipApplicantListItemResponse
{
    public Guid ApplicationId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public string ScholarshipName { get; set; } = string.Empty;
    public string ScholarshipType { get; set; } = string.Empty;
    public decimal GradeAverage { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
}
