using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class SubmitAdmissionApplicationRequest
{
    /// <summary>NewStudent or Transferee - validated server-side against the allowed set.</summary>
    [Required]
    public string ApplicationType { get; set; } = string.Empty;

    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string CourseAppliedFor { get; set; } = string.Empty;

    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string PreviousSchool { get; set; } = string.Empty;
}
