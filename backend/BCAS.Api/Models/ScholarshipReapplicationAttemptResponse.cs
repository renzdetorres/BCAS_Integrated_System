namespace BCAS.Api.Models;

public class ScholarshipReapplicationAttemptResponse
{
    public Guid ApplicationId { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
    public string? ScreeningVerdict { get; set; }
    public string? ScreeningRemarks { get; set; }
}
