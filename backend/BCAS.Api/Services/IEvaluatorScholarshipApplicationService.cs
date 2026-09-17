using BCAS.Api.Models;

namespace BCAS.Api.Services;

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
    /// Moves the application to the next workflow stage. Throws
    /// ScholarshipApplicationNotFoundException if no application has that
    /// id, or ScholarshipWorkflowCannotAdvanceException if it's already at
    /// the final stage (or isn't in a workflow stage at all, e.g. already
    /// decided).
    /// </summary>
    Task<EvaluatorScholarshipApplicationDetailResponse> AdvanceWorkflowAsync(
        Guid applicationId,
        CancellationToken cancellationToken = default);
}
