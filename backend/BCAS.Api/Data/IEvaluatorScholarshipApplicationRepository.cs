using BCAS.Api.Models;

namespace BCAS.Api.Data;

/// <summary>
/// Scholarship application review/decision persistence, shared by both
/// Evaluator (BISAASS-42/43) and Academic Head (BISAASS-47) - the latter
/// reviews the exact same detail and adds the final Approved/Rejected
/// decision on top.
/// </summary>
public interface IEvaluatorScholarshipApplicationRepository
{
    /// <summary>Full detail for one application, or null if no application has that id.</summary>
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

    /// <summary>
    /// Records the Academic Head's final decision and moves Status to that
    /// same value, but only if Status is still 'Result' (optimistic
    /// concurrency, same guard as AdvanceStatusAsync). Returns the updated
    /// detail, or null if no application has that id or it isn't at
    /// 'Result'.
    /// </summary>
    Task<EvaluatorScholarshipApplicationDetail?> RecordFinalDecisionAsync(
        Guid applicationId,
        string decision,
        string? remarks,
        Guid decidedByUserId,
        CancellationToken cancellationToken = default);

    /// <summary>Applications at Status = 'Result', awaiting an Academic Head's decision, oldest first.</summary>
    Task<IReadOnlyList<EvaluatorQueueApplication>> GetReadyForDecisionAsync(int take, CancellationToken cancellationToken = default);
}
