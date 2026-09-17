namespace BCAS.Api.Models;

public class ScholarshipApplicationResponse
{
    public Guid ApplicationId { get; set; }
    public string ScholarshipName { get; set; } = string.Empty;
    public string ScholarshipType { get; set; } = string.Empty;
    public decimal GradeAverage { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
}
