namespace BCAS.Api.Models;

public class ExamRescheduleRequestResponse
{
    public Guid RequestId { get; set; }
    public string Reason { get; set; } = string.Empty;

    /// <summary>Pending, Approved, or Rejected.</summary>
    public string Status { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
}
