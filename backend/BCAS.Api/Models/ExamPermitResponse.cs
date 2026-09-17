namespace BCAS.Api.Models;

public class ExamPermitResponse
{
    public string PermitNumber { get; set; } = string.Empty;
    public int ExamScheduleId { get; set; }
    public string DayType { get; set; } = string.Empty;
    public DateOnly ExamDate { get; set; }
    public TimeOnly ExamTime { get; set; }
    public string Venue { get; set; } = string.Empty;
    public DateTime IssuedAt { get; set; }
}
