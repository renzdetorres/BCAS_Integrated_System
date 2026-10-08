namespace BCAS.Api.Models;

public class DuplicateApplicantFlagResponse
{
    public Guid FlagId { get; set; }

    public Guid NewUserId { get; set; }
    public string NewUserName { get; set; } = string.Empty;
    public string NewUserEmail { get; set; } = string.Empty;

    public Guid MatchedUserId { get; set; }
    public string MatchedUserName { get; set; } = string.Empty;
    public string MatchedUserEmail { get; set; } = string.Empty;

    public string MatchReason { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime DetectedAt { get; set; }

    public string? ReviewedByName { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewNotes { get; set; }

    /// <summary>The matched account's most recent admission application, so staff can see what already exists. All null if it has none.</summary>
    public Guid? MatchedApplicationId { get; set; }
    public string? MatchedApplicationStatus { get; set; }
    public string? MatchedCourseAppliedFor { get; set; }
    public string? MatchedDepartment { get; set; }
    public DateTime? MatchedSubmittedAt { get; set; }
    public int MatchedDocumentsUploaded { get; set; }
    public int MatchedDocumentsVerified { get; set; }
}
