namespace BCAS.Api.Models;

public class EvaluatorDashboardResponse
{
    public int PendingEvaluationsCount { get; set; }
    public IReadOnlyList<EvaluatorQueueApplicationResponse> Queue { get; set; } = Array.Empty<EvaluatorQueueApplicationResponse>();
    public IReadOnlyList<EvaluatorQueueApplicationResponse> RecentlyEvaluated { get; set; } = Array.Empty<EvaluatorQueueApplicationResponse>();
}
