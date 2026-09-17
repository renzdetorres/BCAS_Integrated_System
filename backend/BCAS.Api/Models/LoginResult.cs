namespace BCAS.Api.Models;

public class LoginResult
{
    public UserProfileResponse User { get; set; } = new();
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
}
