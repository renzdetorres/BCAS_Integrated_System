namespace BCAS.Api.Models;

public class RecentScholarshipApplication
{
    public Guid ApplicationId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ScholarshipName { get; set; } = string.Empty;
    public string? Department { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
}
