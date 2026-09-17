namespace BCAS.Api.Models;

public class ExamRescheduleRequest
{
    public Guid RequestId { get; set; }
    public Guid UserId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
}
