using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IDashboardService
{
    Task<IReadOnlyList<DeadlineResponse>> GetUpcomingDeadlinesAsync(CancellationToken cancellationToken = default);
}
