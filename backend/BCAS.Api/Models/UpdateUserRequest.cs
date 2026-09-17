using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

/// <summary>
/// Admin-only request to edit an existing account's profile fields and role.
/// Unlike <see cref="ProvisionStaffRequest"/>, Role here may be any of the
/// five system roles (Applicant included) since this edits an account that
/// already exists rather than provisioning a new staff one.
/// </summary>
public class UpdateUserRequest
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
    public string Role { get; set; } = string.Empty;
}
