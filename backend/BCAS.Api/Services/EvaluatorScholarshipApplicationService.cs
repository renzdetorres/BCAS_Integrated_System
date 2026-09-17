using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class EvaluatorScholarshipApplicationService : IEvaluatorScholarshipApplicationService
{
    private readonly IEvaluatorScholarshipApplicationRepository _applicationRepository;
    private readonly ILogger<EvaluatorScholarshipApplicationService> _logger;

    public EvaluatorScholarshipApplicationService(
        IEvaluatorScholarshipApplicationRepository applicationRepository,
        ILogger<EvaluatorScholarshipApplicationService> logger)
    {
        _applicationRepository = applicationRepository;
        _logger = logger;
    }

    public async Task<EvaluatorScholarshipApplicationDetailResponse> GetDetailAsync(
        Guid applicationId,
        CancellationToken cancellationToken = default)
    {
        var detail = await _applicationRepository.GetDetailAsync(applicationId, cancellationToken)
            ?? throw new ScholarshipApplicationNotFoundException(applicationId);

        return detail.ToResponse();
    }

    public async Task<EvaluatorScholarshipApplicationDetailResponse> RecordScreeningAsync(
        Guid applicationId,
        Guid evaluatorUserId,
        RecordScholarshipScreeningRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!ScholarshipScreeningConstants.AllowedVerdicts.Contains(request.Verdict))
        {
            throw new InvalidScreeningVerdictException(request.Verdict);
        }

        var remarks = string.IsNullOrWhiteSpace(request.Remarks) ? null : request.Remarks.Trim();

        await _applicationRepository.UpsertScreeningAsync(applicationId, request.Verdict, remarks, evaluatorUserId, cancellationToken)
            ?? throw new ScholarshipApplicationNotFoundException(applicationId);

        _logger.LogInformation(
            "Scholarship application {ApplicationId} screened as {Verdict} by {EvaluatorUserId}",
            applicationId,
            request.Verdict,
            evaluatorUserId);

        // Re-fetch the full detail rather than assembling the response from
        // the screening alone, so the returned academic-info comparison
        // reflects the same record the evaluator just acted on.
        var detail = await _applicationRepository.GetDetailAsync(applicationId, cancellationToken)
            ?? throw new ScholarshipApplicationNotFoundException(applicationId);

        return detail.ToResponse();
    }
}
