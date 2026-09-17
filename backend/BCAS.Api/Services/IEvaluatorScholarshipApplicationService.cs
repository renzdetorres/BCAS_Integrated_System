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
}
