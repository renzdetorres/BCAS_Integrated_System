namespace BCAS.Api.Models;

/// <summary>
/// The public-facing shape of a user account, returned by registration,
/// login, session-check (/me), admin staff provisioning, and admin user
/// management.
/// </summary>
public class UserProfileResponse
{
    public Guid UserId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool IsActive { get; set; }

    /// <summary>Free-text department/program name (BISAASS-49). Null unless set for an AcademicHead account.</summary>
    public string? Department { get; set; }
}
