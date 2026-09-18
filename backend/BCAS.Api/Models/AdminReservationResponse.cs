namespace BCAS.Api.Models;

public class AdminReservationResponse
{
    public Guid ApplicationId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public string ApplicationType { get; set; } = string.Empty;
    public string CourseAppliedFor { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }

    public bool IsReserved { get; set; }
    public decimal? ReservationFee { get; set; }
    public string? Remarks { get; set; }
    public DateTime? RecordedAt { get; set; }
    public string? RecordedByName { get; set; }
}
