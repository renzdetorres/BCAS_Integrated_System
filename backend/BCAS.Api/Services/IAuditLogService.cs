using System.Security.Claims;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IAuditLogService
{
    Task LogAsync(ClaimsPrincipal actor, string action, string? details = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// For the one case there's no authenticated ClaimsPrincipal yet to read
    /// from: logging the login itself, where the JWT cookie being issued in
    /// this same response is what the incoming request lacks.
    /// </summary>
    Task LogAsync(Guid? userId, string userEmail, string action, string? details = null, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AuditLogEntry>> SearchAsync(
        string? email, int limit, int offset, CancellationToken cancellationToken = default);
}
