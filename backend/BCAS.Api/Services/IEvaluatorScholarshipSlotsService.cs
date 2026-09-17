using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IEvaluatorScholarshipSlotsService
{
    /// <summary>Slot counts (available/occupied) for every scholarship, active or not - read-only.</summary>
    Task<IReadOnlyList<EvaluatorScholarshipSlotsResponse>> GetSlotsAsync(CancellationToken cancellationToken = default);
}
