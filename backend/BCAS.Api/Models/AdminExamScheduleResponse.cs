namespace BCAS.Api.Models;

public class AdminExamScheduleResponse
{
    public int ExamScheduleId { get; set; }
    public string DayType { get; set; } = string.Empty;
    public DateOnly ExamDate { get; set; }
    public TimeOnly ExamTime { get; set; }
    public string Venue { get; set; } = string.Empty;
    public bool IsOffered { get; set; }
    public IReadOnlyList<AssignedApplicantResponse> AssignedApplicants { get; set; } = Array.Empty<AssignedApplicantResponse>();
}
