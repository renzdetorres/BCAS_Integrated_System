using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class ProvisionStaffRequest
{
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [StringLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "Password must be at least 8 characters long.")]
    public string Password { get; set; } = string.Empty;

    /// <summary>
    /// One of Evaluator, SupportStaff, AcademicHead, Admin. Validated against
    /// the allowed staff role list server-side - Applicant is never accepted
    /// here since it's provisioned only via public self-service registration.
    /// </summary>
    [Required]
    public string Role { get; set; } = string.Empty;
}
