using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IAdminApplicationsService
{
    Task<IReadOnlyList<AdminApplicationListItemResponse>> SearchAsync(
        string? search,
        string? status,
        string? category,
        string? program,
        CancellationToken cancellationToken = default);
}
