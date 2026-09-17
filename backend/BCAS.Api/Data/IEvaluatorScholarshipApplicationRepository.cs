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

    /// <summary>
    /// Moves an application's Status from fromStatus to toStatus, but only
    /// if it's still at fromStatus (optimistic concurrency - guards against
    /// two evaluators advancing the same application at once). Returns the
    /// updated detail, or null if no application has that id or its status
    /// no longer matches fromStatus.
    /// </summary>
    Task<EvaluatorScholarshipApplicationDetail?> AdvanceStatusAsync(
        Guid applicationId,
        string fromStatus,
        string toStatus,
        CancellationToken cancellationToken = default);
}
