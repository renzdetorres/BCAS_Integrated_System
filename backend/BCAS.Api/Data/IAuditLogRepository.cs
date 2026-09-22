using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface IAuditLogRepository
{
    Task InsertAsync(Guid? userId, string userEmail, string action, string? details, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AuditLogEntry>> SearchAsync(
        string? email,
        int limit,
        int offset,
        CancellationToken cancellationToken = default);
}
