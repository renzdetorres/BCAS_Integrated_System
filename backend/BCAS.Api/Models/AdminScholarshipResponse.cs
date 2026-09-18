namespace BCAS.Api.Models;

/// <summary>A scholarship slot with full catalog and slot-count detail (BISAASS-32, Admin-only).</summary>
public class AdminScholarshipResponse
{
    public int ScholarshipId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ScholarshipType { get; set; } = string.Empty;
    public int TotalSlots { get; set; }
    public int RemainingSlots { get; set; }
    public int OccupiedSlots { get; set; }
    public bool IsActive { get; set; }
    public decimal? MinimumGradeAverage { get; set; }
    public bool IsTopOne { get; set; }
    public DateTime CreatedAt { get; set; }
}
