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

    /// <summary>
    /// "Lax" (the default outside local development), "Strict", or "None". None sends the cookie on
    /// cross-site requests, which also lets other sites trigger actions as a signed-in user, so it is
    /// only for a frontend hosted on a different site than the API (set AuthCookie__SameSite=None for that).
    /// </summary>
    public string? SameSite { get; set; }

    /// <summary>
    /// The two cookie attributes for this request. The cookie is Secure whenever the request came over HTTPS
    /// (it must never travel over plain HTTP), and also whenever SameSite is None (browsers refuse None
    /// otherwise). Local development with the frontend and API on different origins keeps SameSite=None.
    /// </summary>
    public (bool Secure, SameSiteMode SameSite) Resolve(bool requestIsHttps, bool isDevelopment)
    {
        SameSiteMode mode;
        if (Enum.TryParse<SameSiteMode>(SameSite, ignoreCase: true, out var configured) && configured != SameSiteMode.Unspecified)
        {
            mode = configured;
        }
        else
        {
            mode = isDevelopment && RequireHttps ? SameSiteMode.None : SameSiteMode.Lax;
        }

        return (requestIsHttps || mode == SameSiteMode.None, mode);
    }
}
