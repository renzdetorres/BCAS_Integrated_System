namespace BCAS.Api.Models;

public class ApplicationHistoryItem
{
    public Guid ApplicationId { get; set; }
    public Guid UserId { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }

    // Admission-specific - null when Category is "Scholarship".
    public string? ApplicationType { get; set; }
    public string? CourseAppliedFor { get; set; }
    public string? PreviousSchool { get; set; }

    // Scholarship-specific - null when Category is "Admission".
    public string? ScholarshipName { get; set; }
    public string? ScholarshipType { get; set; }
    public decimal? GradeAverage { get; set; }
}
