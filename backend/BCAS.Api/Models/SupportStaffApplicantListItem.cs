namespace BCAS.Api.Models;

/// <summary>
/// An Applicant account plus their latest admission application info, for
/// Support Staff's Applicant Records search (BISAASS-53). ApplicationType,
/// CourseAppliedFor, ApplicationStatus, and SubmittedAt are null if the
/// applicant hasn't submitted an admission application yet.
/// </summary>
public class SupportStaffApplicantListItem
{
    public Guid UserId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string? ApplicationType { get; set; }
    public string? CourseAppliedFor { get; set; }
    public string? ApplicationStatus { get; set; }
    public DateTime? SubmittedAt { get; set; }
}
