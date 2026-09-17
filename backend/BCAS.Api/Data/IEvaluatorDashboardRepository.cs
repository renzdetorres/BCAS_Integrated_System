using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface IEvaluatorDashboardRepository
{
    /// <summary>Count of scholarship applications not yet decided (Submitted or UnderReview).</summary>
    Task<int> GetPendingCountAsync(CancellationToken cancellationToken = default);

    /// <summary>Applications awaiting evaluation, oldest first (FIFO queue order).</summary>
    Task<IReadOnlyList<EvaluatorQueueApplication>> GetQueueAsync(int take, CancellationToken cancellationToken = default);

    /// <summary>The most recently decided applications (Approved or Rejected), most recent first.</summary>
    Task<IReadOnlyList<EvaluatorQueueApplication>> GetRecentlyEvaluatedAsync(int take, CancellationToken cancellationToken = default);
}
