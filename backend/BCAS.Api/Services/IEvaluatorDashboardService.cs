using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IEvaluatorDashboardService
{
    Task<EvaluatorDashboardResponse> GetDashboardAsync(CancellationToken cancellationToken = default);
}
