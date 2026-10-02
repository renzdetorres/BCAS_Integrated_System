using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class SetApplicationDepartmentRequest
{
    /// <summary>One of DepartmentConstants.AllowedDepartments - validated server-side.</summary>
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Department { get; set; } = string.Empty;
}
