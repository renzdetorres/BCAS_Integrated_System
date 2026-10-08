namespace BCAS.Api.Models;

public class ExamScheduleSelection
{
    public int ExamScheduleSelectionId { get; set; }
    public Guid UserId { get; set; }
    public int ExamScheduleId { get; set; }
    public string DayType { get; set; } = string.Empty;
    public DateOnly ExamDate { get; set; }
    public TimeOnly ExamTime { get; set; }
    public string Venue { get; set; } = string.Empty;
    public DateTime SelectedAt { get; set; }
    public bool IsPermitReleased { get; set; }
    public DateTime? PermitReleasedAt { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ExamType { get; set; } = "Entrance Exam";
    public decimal? ExamFee { get; set; }
    public string? InvoiceNumber { get; set; }
    public string? SchoolLastAttended { get; set; }
    public string? LevelApplying { get; set; }
    public string? Program { get; set; }
}
