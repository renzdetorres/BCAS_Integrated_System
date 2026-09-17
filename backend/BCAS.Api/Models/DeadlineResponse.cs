namespace BCAS.Api.Models;

public class DeadlineResponse
{
    /// <summary>ScholarshipDeadline, DocumentDeadline, or EnrollmentPeriod.</summary>
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
}
