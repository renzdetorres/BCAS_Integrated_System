namespace BCAS.Api.Models;

public class Scholarship
{
    public int ScholarshipId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ScholarshipType { get; set; } = string.Empty;
    public int TotalSlots { get; set; }
    public int RemainingSlots { get; set; }
    public bool IsActive { get; set; }
}
