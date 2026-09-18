namespace BCAS.Api.Models;

/// <summary>An Approved admission application with its reservation status, if any has been recorded (BISAASS-33, Admin-only).</summary>
public class AdminReservationCandidate
{
    public Guid ApplicationId { get; set; }
    public Guid UserId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public string ApplicationType { get; set; } = string.Empty;
    public string CourseAppliedFor { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }

    /// <summary>False, with the fields below null, until staff records a reservation.</summary>
    public bool IsReserved { get; set; }
    public decimal? ReservationFee { get; set; }
    public string? Remarks { get; set; }
    public DateTime? RecordedAt { get; set; }
    public string? RecordedByName { get; set; }
}
