using BCAS.Api.Data;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class AdminDashboardService : IAdminDashboardService
{
    private const int RecentApplicationsCount = 10;

    private readonly IAdminDashboardRepository _dashboardRepository;

    public AdminDashboardService(IAdminDashboardRepository dashboardRepository)
    {
        _dashboardRepository = dashboardRepository;
    }

    public async Task<AdminDashboardResponse> GetDashboardAsync(CancellationToken cancellationToken = default)
    {
        var analytics = await _dashboardRepository.GetAnalyticsAsync(cancellationToken);
        var byProgram = await _dashboardRepository.GetByProgramAsync(cancellationToken);
        var recent = await _dashboardRepository.GetRecentAsync(RecentApplicationsCount, cancellationToken);

        return new AdminDashboardResponse
        {
            TotalApplications = analytics.TotalApplications,
            TotalApplicants = analytics.TotalApplicants,
            PendingCount = analytics.PendingCount,
            ApprovedCount = analytics.ApprovedCount,
            RejectedCount = analytics.RejectedCount,
            ByProgram = byProgram.Select(p => p.ToResponse()).ToList(),
            RecentApplications = recent.Select(a => a.ToResponse()).ToList(),
        };
    }
}
