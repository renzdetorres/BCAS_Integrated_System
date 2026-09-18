using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class UpdateApplicationStatusRequest
{
    /// <summary>Admission or Scholarship - which table ApplicationId belongs to.</summary>
    [Required]
    public string? Category { get; set; }

    /// <summary>Validated server-side against the allowed set for the given Category.</summary>
    [Required]
    public string? Status { get; set; }

    [StringLength(1000)]
    public string? Remarks { get; set; }
}
