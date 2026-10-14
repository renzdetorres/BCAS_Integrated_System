namespace BCAS.Api.Models;

public class ExamScheduleResponse
{
    public int ExamScheduleId { get; set; }
    public string DayType { get; set; } = string.Empty;
    public DateOnly ExamDate { get; set; }
    public TimeOnly ExamTime { get; set; }
    public string Venue { get; set; } = string.Empty;

    /// <summary>Seats in the slot, or null for no limit.</summary>
    public int? Capacity { get; set; }

    /// <summary>Seats still open, or null for no limit.</summary>
    public int? SeatsLeft { get; set; }

    public bool IsFull { get; set; }
}
