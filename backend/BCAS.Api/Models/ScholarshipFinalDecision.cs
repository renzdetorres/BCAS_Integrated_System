namespace BCAS.Api.Models;

/// <summary>The Academic Head's final Approved/Rejected decision for an application (BISAASS-47).</summary>
public class ScholarshipFinalDecision
{
    public Guid ApplicationId { get; set; }
    public string Decision { get; set; } = string.Empty;
    public string? Remarks { get; set; }
    public string DecidedByName { get; set; } = string.Empty;
    public DateTime DecidedAt { get; set; }
}
