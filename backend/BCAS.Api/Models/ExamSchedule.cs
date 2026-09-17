namespace BCAS.Api.Models;

public class ExamSchedule
{
    public int ExamScheduleId { get; set; }

    /// <summary>Saturday or Weekday.</summary>
    public string DayType { get; set; } = string.Empty;
    public DateOnly ExamDate { get; set; }
    public TimeOnly ExamTime { get; set; }
    public bool IsOffered { get; set; }
}
