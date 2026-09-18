using BCAS.Api.Data;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class SupportStaffDashboardService : ISupportStaffDashboardService
{
    private readonly ISupportStaffDashboardRepository _dashboardRepository;

    public SupportStaffDashboardService(ISupportStaffDashboardRepository dashboardRepository)
    {
        _dashboardRepository = dashboardRepository;
    }

    public Task<SupportStaffDashboardResponse> GetDashboardAsync(CancellationToken cancellationToken = default) =>
        _dashboardRepository.GetCountsAsync(cancellationToken);
}
