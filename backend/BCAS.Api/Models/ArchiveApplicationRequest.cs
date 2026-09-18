using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class ArchiveApplicationRequest
{
    /// <summary>Admission or Scholarship - which table ApplicationId belongs to.</summary>
    [Required]
    public string? Category { get; set; }

    [StringLength(500)]
    public string? Reason { get; set; }
}
