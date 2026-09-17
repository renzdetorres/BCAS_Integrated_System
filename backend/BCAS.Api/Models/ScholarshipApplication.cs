namespace BCAS.Api.Models;

public class ScholarshipApplication
{
    public Guid ApplicationId { get; set; }
    public Guid UserId { get; set; }
    public int ScholarshipId { get; set; }
    public string ScholarshipName { get; set; } = string.Empty;
    public string ScholarshipType { get; set; } = string.Empty;
    public decimal GradeAverage { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
}
