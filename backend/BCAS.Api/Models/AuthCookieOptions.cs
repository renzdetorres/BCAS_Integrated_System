namespace BCAS.Api.Models;

public class AuthCookieOptions
{
    public const string SectionName = "AuthCookie";

    /// <summary>
    /// True (the default) issues an HTTPS-only, SameSite=None cookie - required
    /// whenever the frontend and API differ in scheme or host (local dev's
    /// http://localhost:5173 frontend calling the https://localhost:7100 API,
    /// or a split-domain deployment). Set to false only for a same-origin
    /// deployment that's temporarily HTTP-only (no SSL yet) - the cookie then
    /// becomes SameSite=Lax without Secure, which still works because
    /// same-origin requests don't need SameSite=None at all. Flip this back to
    /// true as soon as HTTPS is available.
    /// </summary>
    public bool RequireHttps { get; set; } = true;
}
