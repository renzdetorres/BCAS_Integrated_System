namespace BCAS.Api.Models;

public class AdminApplicationListItemResponse
{
    public Guid ApplicationId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }

    public string? ApplicationType { get; set; }
    public string? CourseAppliedFor { get; set; }
    public string? PreviousSchool { get; set; }

    public string? ScholarshipName { get; set; }
    public string? ScholarshipType { get; set; }
    public decimal? GradeAverage { get; set; }
}
