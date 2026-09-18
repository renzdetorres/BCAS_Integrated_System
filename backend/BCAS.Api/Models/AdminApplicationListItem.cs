namespace BCAS.Api.Models;

/// <summary>One row of the Admin-Registrar's system-wide application list (BISAASS-28).</summary>
public class AdminApplicationListItem
{
    public Guid ApplicationId { get; set; }
    public Guid UserId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Remarks { get; set; }
    public DateTime SubmittedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Archive metadata (BISAASS-35) - Archived* stay null while IsArchived is false.
    public bool IsArchived { get; set; }
    public DateTime? ArchivedAt { get; set; }
    public Guid? ArchivedByUserId { get; set; }
    public string? ArchiveReason { get; set; }

    // Admission-specific - null when Category is "Scholarship".
    public string? ApplicationType { get; set; }
    public string? CourseAppliedFor { get; set; }
    public string? PreviousSchool { get; set; }

    // Scholarship-specific - null when Category is "Admission".
    public string? ScholarshipName { get; set; }
    public string? ScholarshipType { get; set; }
    public decimal? GradeAverage { get; set; }
}
