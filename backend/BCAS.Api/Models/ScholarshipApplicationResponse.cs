namespace BCAS.Api.Models;

public class ScholarshipApplicationResponse
{
    public Guid ApplicationId { get; set; }
    public string ScholarshipName { get; set; } = string.Empty;
    public string ScholarshipType { get; set; } = string.Empty;
    public decimal GradeAverage { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
    public string? LevelApplied { get; set; }

    /// <summary>
    /// The applicant's own answers on the scholarship form, so the page can print a ready-to-sign copy.
    /// Every field is null for applications filed before the form existed.
    /// </summary>
    public ScholarshipApplicationDetails Form { get; set; } = new();
}
