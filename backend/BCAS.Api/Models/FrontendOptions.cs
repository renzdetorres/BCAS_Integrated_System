namespace BCAS.Api.Models;

/// <summary>
/// Where the SPA is reachable, used to build links that go out in emails
/// (password reset). It must be set (Frontend__BaseUrl) everywhere except
/// local development: the request's Host header is attacker-controlled, so on
/// the live site no reset email is sent without it rather than risk a link
/// pointing at someone else's site. Local development falls back to the
/// request's own address, where the Vite dev server (5173) and the API (7100)
/// are different origins anyway.
/// </summary>
public class FrontendOptions
{
    public const string SectionName = "Frontend";

    public string? BaseUrl { get; set; }
}
