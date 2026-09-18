namespace BCAS.Api.Models;

/// <summary>One row of the Scholarship Applicant List report (BISAASS-37) - every scholarship application, any status.</summary>
public class ScholarshipApplicantListItem
{
    public Guid ApplicationId { get; set; }
    public Guid UserId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public string ScholarshipName { get; set; } = string.Empty;
    public string ScholarshipType { get; set; } = string.Empty;
    public decimal GradeAverage { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
}
