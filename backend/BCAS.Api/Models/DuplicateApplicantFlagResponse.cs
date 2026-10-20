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
}
