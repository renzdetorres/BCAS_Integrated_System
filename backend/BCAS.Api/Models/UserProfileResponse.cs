namespace BCAS.Api.Models;

/// <summary>
/// The public-facing shape of a user account, returned by registration,
/// login, session-check (/me), and admin staff provisioning.
/// </summary>
public class UserProfileResponse
{
    public Guid UserId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
}
