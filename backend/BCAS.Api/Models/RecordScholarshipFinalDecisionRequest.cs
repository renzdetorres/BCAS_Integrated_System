using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class RecordScholarshipFinalDecisionRequest
{
    /// <summary>Approved or Rejected, validated server-side against ScholarshipFinalDecisionConstants.AllowedDecisions.</summary>
    [Required]
    public string Decision { get; set; } = string.Empty;

    [StringLength(1000)]
    public string? Remarks { get; set; }
}
