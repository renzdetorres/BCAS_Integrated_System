using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class CreateAnnouncementRequest
{
    /// <summary>Admission or Scholarship.</summary>
    [Required]
    public string? Category { get; set; }

    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [StringLength(2000, MinimumLength = 1)]
    public string Body { get; set; } = string.Empty;
}
