using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

/// <summary>Self-service edit of a staff account's own name and email. Role and active status are never editable here.</summary>
public class UpdateMyProfileRequest
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
}
