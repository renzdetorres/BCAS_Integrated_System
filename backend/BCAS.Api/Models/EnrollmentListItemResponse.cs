namespace BCAS.Api.Models;

public class EnrollmentListItemResponse
{
    public Guid ApplicationId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public string ApplicationType { get; set; } = string.Empty;
    public string CourseAppliedFor { get; set; } = string.Empty;
    public string? PreviousSchool { get; set; }
    public DateTime SubmittedAt { get; set; }
    public decimal? ReservationFee { get; set; }
    public DateTime? ReservedAt { get; set; }
}
