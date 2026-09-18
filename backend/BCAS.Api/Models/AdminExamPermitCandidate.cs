namespace BCAS.Api.Models;

/// <summary>An applicant's exam schedule selection with permit release status (BISAASS-30, Admin-only).</summary>
public class AdminExamPermitCandidate
{
    public Guid UserId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public int ExamScheduleSelectionId { get; set; }
    public int ExamScheduleId { get; set; }
    public string DayType { get; set; } = string.Empty;
    public DateOnly ExamDate { get; set; }
    public TimeOnly ExamTime { get; set; }
    public string Venue { get; set; } = string.Empty;
    public DateTime SelectedAt { get; set; }
    public bool IsPermitReleased { get; set; }
    public DateTime? PermitReleasedAt { get; set; }
}
