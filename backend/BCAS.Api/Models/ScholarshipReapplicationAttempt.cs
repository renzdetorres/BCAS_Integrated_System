namespace BCAS.Api.Models;

/// <summary>An earlier application by the same applicant for the same scholarship.</summary>
public class ScholarshipReapplicationAttempt
{
    public Guid ApplicationId { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }

    /// <summary>Null if that attempt was never screened.</summary>
    public string? ScreeningVerdict { get; set; }
    public string? ScreeningRemarks { get; set; }
}
