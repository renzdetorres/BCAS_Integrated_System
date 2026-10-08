using System.ComponentModel.DataAnnotations;
using BCAS.Api.Constants;

namespace BCAS.Api.Models;

public class SubmitScholarshipApplicationRequest
{
    [Required]
    public int? ScholarshipId { get; set; }

    [Required]
    [Range(0, 999.99)]
    public decimal? GradeAverage { get; set; }

    /// <summary>Grade 7, Grade 11 or First Year College.</summary>
    [Required]
    [AllowedValues("Grade 7", "Grade 11", "First Year College")]
    public string? LevelApplied { get; set; }

    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string? ApplicantFullName { get; set; }

    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string? SchoolLastAttended { get; set; }

    /// <summary>Parent or Official guardian.</summary>
    [Required]
    [AllowedValues("Parent", "Official guardian")]
    public string? GuardianRole { get; set; }

    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string? GuardianName { get; set; }

    [Required]
    [StringLength(50, MinimumLength = 1)]
    public string? GuardianContact { get; set; }

    [Required]
    [EmailAddress]
    [StringLength(256)]
    public string? GuardianEmail { get; set; }

    [Required]
    public bool? ConsentTerms { get; set; }

    [Required]
    public bool? ConsentParticipation { get; set; }

    [Required]
    public bool? ConsentCertification { get; set; }
}
