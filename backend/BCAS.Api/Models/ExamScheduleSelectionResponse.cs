namespace BCAS.Api.Models;

public class ExamScheduleSelectionResponse
{
    public int ExamScheduleId { get; set; }
    public string DayType { get; set; } = string.Empty;
    public DateOnly ExamDate { get; set; }
    public TimeOnly ExamTime { get; set; }
    public DateTime SelectedAt { get; set; }
}
