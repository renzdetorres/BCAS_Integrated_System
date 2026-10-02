using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class SetApplicationDepartmentRequest
{
    /// <summary>One of DepartmentConstants.AllowedDepartments - validated server-side.</summary>
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Department { get; set; } = string.Empty;

    /// <summary>
    /// The program to file the application under. Needed only when the
    /// department has a fixed program list (College) and the application's
    /// current course isn't one of them; otherwise the course is kept.
    /// </summary>
    [StringLength(200)]
    public string? Program { get; set; }
}
