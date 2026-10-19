using System.Security.Cryptography;
using System.Text;

namespace BCAS.Api.Services;

/// <summary>
/// A short, one-way marker of an account's current password hash. It rides inside the login token, and the
/// token is only accepted while it still matches the account, so changing or resetting the password signs
/// out every other session (and any stolen one) without needing a column in the database.
/// </summary>
public static class PasswordFingerprint
{
    public const string ClaimType = "pwd";

    public static string Of(string passwordHash) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(passwordHash)))[..16];
}
