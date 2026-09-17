using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface IScholarshipRepository
{
    /// <summary>Active scholarships with at least one remaining slot, for applicants to browse.</summary>
    Task<IReadOnlyList<Scholarship>> GetAvailableAsync(CancellationToken cancellationToken = default);

    /// <summary>Every scholarship regardless of active status or remaining slots, for the Evaluator slots view (read-only).</summary>
    Task<IReadOnlyList<Scholarship>> GetAllAsync(CancellationToken cancellationToken = default);
}
