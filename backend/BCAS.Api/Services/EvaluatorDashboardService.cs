using BCAS.Api.Data;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class EvaluatorDashboardService : IEvaluatorDashboardService
{
    private const int QueueDisplayCount = 20;
    private const int RecentlyEvaluatedCount = 10;

    private readonly IEvaluatorDashboardRepository _dashboardRepository;

    public EvaluatorDashboardService(IEvaluatorDashboardRepository dashboardRepository)
    {
        _dashboardRepository = dashboardRepository;
    }

    public async Task<EvaluatorDashboardResponse> GetDashboardAsync(CancellationToken cancellationToken = default)
    {
        var pendingCount = await _dashboardRepository.GetPendingCountAsync(cancellationToken);
        var queue = await _dashboardRepository.GetQueueAsync(QueueDisplayCount, cancellationToken);
        var recentlyEvaluated = await _dashboardRepository.GetRecentlyEvaluatedAsync(RecentlyEvaluatedCount, cancellationToken);

        return new EvaluatorDashboardResponse
        {
            PendingEvaluationsCount = pendingCount,
            Queue = queue.Select(a => a.ToResponse()).ToList(),
            RecentlyEvaluated = recentlyEvaluated.Select(a => a.ToResponse()).ToList(),
        };
    }
}
