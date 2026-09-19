using BCAS.Api.Models;

namespace BCAS.Api.Services;

/// <summary>
/// Scholarship application review, shared by both Evaluator (BISAASS-42/43)
/// and Academic Head (BISAASS-47), the latter through its own
/// AcademicHeadScholarshipApplicationsController.
/// </summary>
public interface IEvaluatorScholarshipApplicationService
{
    /// <summary>Throws ScholarshipApplicationNotFoundException if no application has that id.</summary>
    Task<EvaluatorScholarshipApplicationDetailResponse> GetDetailAsync(
        Guid applicationId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Throws InvalidScreeningVerdictException for an unrecognized verdict,
    /// or ScholarshipApplicationNotFoundException if no application has that
    /// id.
    /// </summary>
    Task<EvaluatorScholarshipApplicationDetailResponse> RecordScreeningAsync(
        Guid applicationId,
        Guid evaluatorUserId,
        RecordScholarshipScreeningRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Moves the application to the next workflow stage, recording the
    /// change (evaluatorUserId, BISAASS-57) in the status-history audit
    /// trail. Throws ScholarshipApplicationNotFoundException if no
    /// application has that id, or ScholarshipWorkflowCannotAdvanceException
    /// if it's already at the final stage (or isn't in a workflow stage at
    /// all, e.g. already decided).
    /// </summary>
    Task<EvaluatorScholarshipApplicationDetailResponse> AdvanceWorkflowAsync(
        Guid applicationId,
        Guid evaluatorUserId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Academic Head only in practice (enforced by the caller's
    /// controller): confirms the final Approved/Rejected decision. Throws
    /// InvalidFinalDecisionException for an unrecognized decision,
    /// ScholarshipApplicationNotFoundException if no application has that
    /// id, or ScholarshipApplicationNotReadyForDecisionException if it
    /// hasn't reached the 'Result' stage.
    /// </summary>
    Task<EvaluatorScholarshipApplicationDetailResponse> RecordFinalDecisionAsync(
        Guid applicationId,
        Guid decidedByUserId,
        RecordScholarshipFinalDecisionRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>Applications at Status = 'Result', awaiting an Academic Head's decision, oldest first.</summary>
    Task<IReadOnlyList<EvaluatorQueueApplicationResponse>> GetReadyForDecisionAsync(
        int take,
        CancellationToken cancellationToken = default);
}
