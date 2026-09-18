namespace BCAS.Api.Models;

/// <summary>An exam schedule with the applicants assigned to it (BISAASS-29, Admin-only).</summary>
public class AdminExamSchedule
{
    public int ExamScheduleId { get; set; }
    public string DayType { get; set; } = string.Empty;
    public DateOnly ExamDate { get; set; }
    public TimeOnly ExamTime { get; set; }
    public string Venue { get; set; } = string.Empty;
    public bool IsOffered { get; set; }
    public IReadOnlyList<AssignedApplicant> AssignedApplicants { get; set; } = Array.Empty<AssignedApplicant>();
}
