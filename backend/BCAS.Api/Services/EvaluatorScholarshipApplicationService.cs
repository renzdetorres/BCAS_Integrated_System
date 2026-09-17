using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class EvaluatorScholarshipApplicationService : IEvaluatorScholarshipApplicationService
{
    private readonly IEvaluatorScholarshipApplicationRepository _applicationRepository;
    private readonly IApplicantDocumentRepository _documentRepository;
    private readonly ILogger<EvaluatorScholarshipApplicationService> _logger;

    public EvaluatorScholarshipApplicationService(
        IEvaluatorScholarshipApplicationRepository applicationRepository,
        IApplicantDocumentRepository documentRepository,
        ILogger<EvaluatorScholarshipApplicationService> logger)
    {
        _applicationRepository = applicationRepository;
        _documentRepository = documentRepository;
        _logger = logger;
    }

    public async Task<EvaluatorScholarshipApplicationDetailResponse> GetDetailAsync(
        Guid applicationId,
        CancellationToken cancellationToken = default)
    {
        var detail = await _applicationRepository.GetDetailAsync(applicationId, cancellationToken)
            ?? throw new ScholarshipApplicationNotFoundException(applicationId);

        return await BuildResponseAsync(detail, cancellationToken);
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

        return await BuildResponseAsync(detail, cancellationToken);
    }

    public async Task<EvaluatorScholarshipApplicationDetailResponse> AdvanceWorkflowAsync(
        Guid applicationId,
        CancellationToken cancellationToken = default)
    {
        var current = await _applicationRepository.GetDetailAsync(applicationId, cancellationToken)
            ?? throw new ScholarshipApplicationNotFoundException(applicationId);

        var currentIndex = ScholarshipWorkflowConstants.Stages.ToList().IndexOf(current.Status);
        if (currentIndex < 0 || currentIndex == ScholarshipWorkflowConstants.Stages.Count - 1)
        {
            throw new ScholarshipWorkflowCannotAdvanceException(applicationId, current.Status);
        }

        var nextStatus = ScholarshipWorkflowConstants.Stages[currentIndex + 1];

        // A raced concurrent advance (someone else moved it between the read
        // above and this write) also surfaces as "cannot advance from the
        // status we last saw" - accurate enough without a dedicated
        // conflict exception for what's a rare, low-stakes race here.
        var updated = await _applicationRepository.AdvanceStatusAsync(applicationId, current.Status, nextStatus, cancellationToken)
            ?? throw new ScholarshipWorkflowCannotAdvanceException(applicationId, current.Status);

        _logger.LogInformation(
            "Scholarship application {ApplicationId} advanced from {From} to {To}",
            applicationId,
            current.Status,
            nextStatus);

        return await BuildResponseAsync(updated, cancellationToken);
    }

    private async Task<EvaluatorScholarshipApplicationDetailResponse> BuildResponseAsync(
        EvaluatorScholarshipApplicationDetail detail,
        CancellationToken cancellationToken)
    {
        var documents = await _documentRepository.GetByUserIdAsync(detail.UserId, cancellationToken);
        return detail.ToResponse(documents);
    }
}
