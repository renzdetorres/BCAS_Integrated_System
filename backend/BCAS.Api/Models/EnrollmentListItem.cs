namespace BCAS.Api.Models;

/// <summary>
/// One enrolled admission applicant (BISAASS-37) - an Approved admission
/// application whose applicant has reserved their slot (BISAASS-33). Backs
/// the Enrollment List, Summary of Enrollment, and File per Section reports.
/// </summary>
public class EnrollmentListItem
{
    public Guid ApplicationId { get; set; }
    public Guid UserId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public string ApplicationType { get; set; } = string.Empty;
    public string CourseAppliedFor { get; set; } = string.Empty;
    public string? PreviousSchool { get; set; }
    public DateTime SubmittedAt { get; set; }
    public decimal? ReservationFee { get; set; }
    public DateTime? ReservedAt { get; set; }
}
