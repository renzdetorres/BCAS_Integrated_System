using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class ResolveDuplicateFlagRequest
{
    /// <summary>'Dismissed' (false positive, not the same person) or 'ConfirmedDuplicate'.</summary>
    [Required]
    public string Status { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Notes { get; set; }
}
