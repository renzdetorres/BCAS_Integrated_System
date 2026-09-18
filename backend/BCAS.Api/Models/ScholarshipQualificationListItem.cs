namespace BCAS.Api.Models;

/// <summary>One row of the Qualified/Not Qualified Applicants report (BISAASS-37) - an Evaluator's eligibility screening verdict.</summary>
public class ScholarshipQualificationListItem
{
    public Guid ApplicationId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public string ScholarshipName { get; set; } = string.Empty;

    /// <summary>Qualified or NotQualified.</summary>
    public string Verdict { get; set; } = string.Empty;
    public string? Remarks { get; set; }
    public string EvaluatedByName { get; set; } = string.Empty;
    public DateTime EvaluatedAt { get; set; }
}
