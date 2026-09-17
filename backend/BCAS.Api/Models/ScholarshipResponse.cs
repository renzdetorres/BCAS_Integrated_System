namespace BCAS.Api.Models;

public class ScholarshipResponse
{
    public int ScholarshipId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ScholarshipType { get; set; } = string.Empty;
    public int RemainingSlots { get; set; }
}
