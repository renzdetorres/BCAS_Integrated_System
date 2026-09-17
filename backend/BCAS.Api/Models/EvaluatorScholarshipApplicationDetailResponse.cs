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
    public DateTime UpdatedAt { get; set; }
    public ScholarshipScreeningResponse? Screening { get; set; }
    public IReadOnlyList<EvaluatorApplicantDocumentResponse> Documents { get; set; } = Array.Empty<EvaluatorApplicantDocumentResponse>();

    /// <summary>The full ordered workflow (Submitted -> ... -> Result), for rendering a progress stepper.</summary>
    public IReadOnlyList<string> WorkflowStages { get; set; } = Array.Empty<string>();

    /// <summary>True if Status is a workflow stage other than the last one - i.e. Advance can be called.</summary>
    public bool CanAdvance { get; set; }

    public ScholarshipEligibilityRulesResponse EligibilityRules { get; set; } = new();

    /// <summary>Null until an Academic Head confirms Approved/Rejected.</summary>
    public ScholarshipFinalDecisionResponse? FinalDecision { get; set; }

    /// <summary>True if Status is "Result" - i.e. an Academic Head can confirm a final decision.</summary>
    public bool CanConfirmDecision { get; set; }
}
