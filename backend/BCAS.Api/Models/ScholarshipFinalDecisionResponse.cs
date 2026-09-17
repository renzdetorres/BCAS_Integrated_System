namespace BCAS.Api.Models;

public class ScholarshipFinalDecisionResponse
{
    public string Decision { get; set; } = string.Empty;
    public string? Remarks { get; set; }
    public string DecidedByName { get; set; } = string.Empty;
    public DateTime DecidedAt { get; set; }
}
