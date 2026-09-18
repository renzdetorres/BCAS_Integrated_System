using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface ISupportStaffDashboardService
{
    Task<SupportStaffDashboardResponse> GetDashboardAsync(CancellationToken cancellationToken = default);
}
