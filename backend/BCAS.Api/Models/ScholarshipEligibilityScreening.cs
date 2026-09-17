namespace BCAS.Api.Models;

public class ScholarshipEligibilityScreening
{
    public Guid ApplicationId { get; set; }
    public string Verdict { get; set; } = string.Empty;
    public string? Remarks { get; set; }
    public string EvaluatedByName { get; set; } = string.Empty;
    public DateTime EvaluatedAt { get; set; }
}
