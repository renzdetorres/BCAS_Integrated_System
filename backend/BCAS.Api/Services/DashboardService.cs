using BCAS.Api.Data;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class DashboardService : IDashboardService
{
    private readonly IDeadlineRepository _deadlineRepository;

    public DashboardService(IDeadlineRepository deadlineRepository)
    {
        _deadlineRepository = deadlineRepository;
    }

    public async Task<IReadOnlyList<DeadlineResponse>> GetUpcomingDeadlinesAsync(CancellationToken cancellationToken = default)
    {
        var deadlines = await _deadlineRepository.GetUpcomingAsync(cancellationToken);

        return deadlines
            .Select(d => new DeadlineResponse
            {
                Type = d.DeadlineType,
                Title = d.Title,
                Date = d.DeadlineDate,
            })
            .ToList();
    }
}
