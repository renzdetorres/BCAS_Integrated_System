namespace BCAS.Api.Models;

/// <summary>Read-only slot counts for one scholarship (BISAASS-45 - Evaluator can view, never edit).</summary>
public class EvaluatorScholarshipSlotsResponse
{
    public int ScholarshipId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ScholarshipType { get; set; } = string.Empty;
    public int TotalSlots { get; set; }
    public int RemainingSlots { get; set; }
    public int OccupiedSlots { get; set; }
    public bool IsActive { get; set; }
}
