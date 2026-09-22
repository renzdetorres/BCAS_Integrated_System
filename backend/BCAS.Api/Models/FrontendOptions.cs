namespace BCAS.Api.Models;

/// <summary>
/// Where the SPA is reachable, used to build links that go out in emails
/// (password reset). Left empty in production on purpose - frontend and API
/// are served from the same origin there (Program.cs's SPA fallback), so
/// the incoming request's own scheme+host is the right base. Only needs an
/// explicit value in local dev, where the Vite dev server (5173) and the API
/// (7100) are genuinely different origins.
/// </summary>
public class FrontendOptions
{
    public const string SectionName = "Frontend";

    public string? BaseUrl { get; set; }
}
