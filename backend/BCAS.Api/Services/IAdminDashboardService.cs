using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IAdminDashboardService
{
    Task<AdminDashboardResponse> GetDashboardAsync(CancellationToken cancellationToken = default);
}
