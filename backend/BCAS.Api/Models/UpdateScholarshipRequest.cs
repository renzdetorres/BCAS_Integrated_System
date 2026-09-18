using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class UpdateScholarshipRequest
{
    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string ScholarshipType { get; set; } = string.Empty;

    [Required]
    [Range(1, int.MaxValue, ErrorMessage = "Total slots must be at least 1.")]
    public int? TotalSlots { get; set; }

    [Range(0, 100)]
    public decimal? MinimumGradeAverage { get; set; }
}
