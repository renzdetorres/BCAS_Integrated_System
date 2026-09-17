using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class SubmitScholarshipApplicationRequest
{
    [Required]
    public int? ScholarshipId { get; set; }

    [Required]
    [Range(0, 999.99)]
    public decimal? GradeAverage { get; set; }
}
