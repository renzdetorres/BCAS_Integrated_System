namespace BCAS.Api.Models;

public class AdmissionApplicationResponse
{
    public Guid ApplicationId { get; set; }
    public string ApplicationType { get; set; } = string.Empty;
    public string CourseAppliedFor { get; set; } = string.Empty;
    public string? Department { get; set; }
    public string PreviousSchool { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
    public string ApplicationNumber { get; set; } = string.Empty;
    public AdmissionFormDetails Form { get; set; } = new();

    /// <summary>True only on the response to the submission itself, when the chosen level had no admission slot left.</summary>
    public bool SlotReached { get; set; }

    /// <summary>What the applicant is told when SlotReached is true.</summary>
    public string? SlotMessage { get; set; }
}
