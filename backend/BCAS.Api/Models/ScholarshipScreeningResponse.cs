namespace BCAS.Api.Models;

public class ScholarshipScreeningResponse
{
    public string Verdict { get; set; } = string.Empty;
    public string? Remarks { get; set; }
    public string EvaluatedByName { get; set; } = string.Empty;
    public DateTime EvaluatedAt { get; set; }
}
