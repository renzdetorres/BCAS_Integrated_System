using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class RecordScholarshipScreeningRequest
{
    /// <summary>Qualified or NotQualified, validated server-side against ScholarshipScreeningConstants.AllowedVerdicts.</summary>
    [Required]
    public string Verdict { get; set; } = string.Empty;

    [StringLength(1000)]
    public string? Remarks { get; set; }
}
