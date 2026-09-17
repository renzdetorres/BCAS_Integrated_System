namespace BCAS.Api.Models;

public class EvaluatorScholarshipApplicationDetail
{
    public Guid ApplicationId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;

    /// <summary>Null if the applicant has no profile yet (shouldn't happen - a profile is required to submit).</summary>
    public bool? IsBcasian { get; set; }
    public string ScholarshipName { get; set; } = string.Empty;
    public string ScholarshipType { get; set; } = string.Empty;
    public decimal GradeAverage { get; set; }

    /// <summary>Null if the scholarship has no minimum grade requirement configured.</summary>
    public decimal? MinimumGradeAverage { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }

    /// <summary>Null if this application hasn't been screened yet.</summary>
    public ScholarshipEligibilityScreening? Screening { get; set; }
}
