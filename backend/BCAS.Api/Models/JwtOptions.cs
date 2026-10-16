namespace BCAS.Api.Models;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public string SigningKey { get; set; } = string.Empty;
    public int ExpiryMinutes { get; set; } = 60;

    /// <summary>
    /// Why the signing key can't be trusted, or null if it can. The key shipped in appsettings.json is a
    /// placeholder that anyone can read in the repository; a site running with it (or with a short key)
    /// would let anyone mint a valid login for any account, including an Admin.
    /// </summary>
    public string? SigningKeyProblem()
    {
        if (string.IsNullOrWhiteSpace(SigningKey) || SigningKey.StartsWith("REPLACE_WITH", StringComparison.OrdinalIgnoreCase))
        {
            return "The login signing key (Jwt:SigningKey) is not set. Set Jwt__SigningKey on the server to a long random secret (at least 32 characters). The key in appsettings.json is a public placeholder, so the site refuses to start with it.";
        }

        if (System.Text.Encoding.UTF8.GetByteCount(SigningKey) < 32)
        {
            return "The login signing key (Jwt:SigningKey) is too short. Use a random secret of at least 32 characters.";
        }

        return null;
    }
}
