namespace BCAS.Api.Models;

public class EvaluatorScholarshipApplicationDetailResponse
{
    public Guid ApplicationId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public bool? IsBcasian { get; set; }
    public string ScholarshipName { get; set; } = string.Empty;
    public string ScholarshipType { get; set; } = string.Empty;
    public decimal GradeAverage { get; set; }
    public decimal? MinimumGradeAverage { get; set; }

    /// <summary>Null if the scholarship has no minimum grade requirement to compare against.</summary>
    public bool? MeetsMinimumGrade { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
    public ScholarshipScreeningResponse? Screening { get; set; }
}
