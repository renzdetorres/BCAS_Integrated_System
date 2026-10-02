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

    /// <summary>
    /// The department being applied into - validated server-side against
    /// DepartmentConstants.AllowedDepartments. Decides which Academic Head
    /// reviews this applicant.
    /// </summary>
    [StringLength(100)]
    public string? Department { get; set; }

    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string PreviousSchool { get; set; } = string.Empty;
}
