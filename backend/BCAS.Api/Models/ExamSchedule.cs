namespace BCAS.Api.Models;

public class ExamSchedule
{
    public int ExamScheduleId { get; set; }

    /// <summary>Saturday or Weekday.</summary>
    public string DayType { get; set; } = string.Empty;
    public DateOnly ExamDate { get; set; }
    public TimeOnly ExamTime { get; set; }
    public string Venue { get; set; } = string.Empty;
    public bool IsOffered { get; set; }

    /// <summary>Seats in the slot, or null for no limit.</summary>
    public int? Capacity { get; set; }

    /// <summary>Applicants currently holding a seat in the slot.</summary>
    public int Taken { get; set; }
}
