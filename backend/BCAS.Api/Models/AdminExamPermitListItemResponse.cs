namespace BCAS.Api.Models;

public class AdminExamPermitListItemResponse
{
    public Guid UserId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public string PermitNumber { get; set; } = string.Empty;
    public string DayType { get; set; } = string.Empty;
    public DateOnly ExamDate { get; set; }
    public TimeOnly ExamTime { get; set; }
    public string Venue { get; set; } = string.Empty;
    public bool DocumentsVerified { get; set; }
    public bool IsReleased { get; set; }
    public DateTime? ReleasedAt { get; set; }
}
