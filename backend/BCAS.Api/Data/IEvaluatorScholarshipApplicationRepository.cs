using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface IEvaluatorScholarshipApplicationRepository
{
    /// <summary>Full evaluator-facing detail for one application, or null if no application has that id.</summary>
    Task<EvaluatorScholarshipApplicationDetail?> GetDetailAsync(Guid applicationId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Records or replaces the screening verdict for an application (one row
    /// per application - a re-screening overwrites the previous verdict).
    /// Returns the saved screening, or null if no application has that id.
    /// </summary>
    Task<ScholarshipEligibilityScreening?> UpsertScreeningAsync(
        Guid applicationId,
        string verdict,
        string? remarks,
        Guid evaluatedByUserId,
        CancellationToken cancellationToken = default);
}
