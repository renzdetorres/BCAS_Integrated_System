namespace BCAS.Api.Models;

public class AdminApplicationListItemResponse
{
    public Guid ApplicationId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Remarks { get; set; }
    public DateTime SubmittedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    /// <summary>The application's workflow step view (BISAASS-22), computed the same way for any application.</summary>
    public IReadOnlyList<TrackingStepResponse> Steps { get; set; } = Array.Empty<TrackingStepResponse>();

    // Archive metadata (BISAASS-35) - Archived* stay null while IsArchived is false.
    public bool IsArchived { get; set; }
    public DateTime? ArchivedAt { get; set; }
    public Guid? ArchivedByUserId { get; set; }
    public string? ArchiveReason { get; set; }

    public string? ApplicationType { get; set; }
    public string? CourseAppliedFor { get; set; }
    public string? PreviousSchool { get; set; }

    public string? ScholarshipName { get; set; }
    public string? ScholarshipType { get; set; }
    public decimal? GradeAverage { get; set; }
}
