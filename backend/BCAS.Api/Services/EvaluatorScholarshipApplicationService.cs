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
    private readonly IApplicationStatusHistoryRepository _statusHistoryRepository;
    private readonly INotificationDispatchService _notificationDispatchService;
    private readonly IScholarshipApplicationRepository _scholarshipApplicationRepository;
    private readonly ILogger<EvaluatorScholarshipApplicationService> _logger;

    public EvaluatorScholarshipApplicationService(
        IEvaluatorScholarshipApplicationRepository applicationRepository,
        IApplicantDocumentRepository documentRepository,
        IApplicationStatusHistoryRepository statusHistoryRepository,
        INotificationDispatchService notificationDispatchService,
        IScholarshipApplicationRepository scholarshipApplicationRepository,
        ILogger<EvaluatorScholarshipApplicationService> logger)
    {
        _applicationRepository = applicationRepository;
        _documentRepository = documentRepository;
        _statusHistoryRepository = statusHistoryRepository;
        _notificationDispatchService = notificationDispatchService;
        _scholarshipApplicationRepository = scholarshipApplicationRepository;
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

        _ = await _applicationRepository.UpsertScreeningAsync(applicationId, request.Verdict, remarks, evaluatorUserId, cancellationToken)
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
        Guid evaluatorUserId,
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

        // Status-history audit trail (BISAASS-57) - the counterpart to
        // AdminApplicationsService.UpdateStatusAsync's own insert, so every
        // way a Scholarship application's status can change is recorded.
        await _statusHistoryRepository.InsertAsync(
            applicationId, "Scholarship", current.Status, nextStatus, remarks: null, evaluatorUserId, cancellationToken);

        _logger.LogInformation(
            "Scholarship application {ApplicationId} advanced from {From} to {To}",
            applicationId,
            current.Status,
            nextStatus);

        return await BuildResponseAsync(updated, cancellationToken);
    }

    public async Task<EvaluatorScholarshipApplicationDetailResponse> RecordFinalDecisionAsync(
        Guid applicationId,
        Guid decidedByUserId,
        RecordScholarshipFinalDecisionRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!ScholarshipFinalDecisionConstants.AllowedDecisions.Contains(request.Decision))
        {
            throw new InvalidFinalDecisionException(request.Decision);
        }

        var current = await _applicationRepository.GetDetailAsync(applicationId, cancellationToken)
            ?? throw new ScholarshipApplicationNotFoundException(applicationId);

        if (current.Status != ScholarshipWorkflowConstants.Stages[^1])
        {
            throw new ScholarshipApplicationNotReadyForDecisionException(applicationId, current.Status);
        }

        var remarks = string.IsNullOrWhiteSpace(request.Remarks) ? null : request.Remarks.Trim();

        // A raced concurrent decision (or workflow change) between the read
        // above and this write also surfaces as "not ready" - accurate
        // enough without a dedicated conflict exception for what's a rare,
        // low-stakes race here.
        var updated = await _applicationRepository.RecordFinalDecisionAsync(applicationId, request.Decision, remarks, decidedByUserId, cancellationToken)
            ?? throw new ScholarshipApplicationNotReadyForDecisionException(applicationId, current.Status);

        // Status-history audit trail (BISAASS-57) - see AdvanceWorkflowAsync.
        await _statusHistoryRepository.InsertAsync(
            applicationId, "Scholarship", current.Status, request.Decision, remarks, decidedByUserId, cancellationToken);

        // Scholarship Result notification (BISAASS-59).
        var applicantFirstName = current.ApplicantName.Split(' ', 2)[0];
        await _notificationDispatchService.NotifyScholarshipResultAsync(
            current.UserId, current.ApplicantEmail, applicantFirstName, request.Decision, current.ScholarshipName, cancellationToken);

        // Scholarship waitlist: release the slot back on rejection - the
        // Academic Head's dedicated decision flow is the other of the two
        // paths a scholarship application can reach "Rejected" through, see
        // AdminApplicationsService.UpdateStatusAsync for the Admin override.
        if (request.Decision == "Rejected")
        {
            await _scholarshipApplicationRepository.ReleaseSlotByApplicationIdAsync(applicationId, cancellationToken);
        }

        _logger.LogInformation(
            "Scholarship application {ApplicationId} decided as {Decision} by {DecidedByUserId}",
            applicationId,
            request.Decision,
            decidedByUserId);

        return await BuildResponseAsync(updated, cancellationToken);
    }

    public async Task<IReadOnlyList<EvaluatorQueueApplicationResponse>> GetReadyForDecisionAsync(
        int take,
        CancellationToken cancellationToken = default)
    {
        var applications = await _applicationRepository.GetReadyForDecisionAsync(take, cancellationToken);
        return applications.Select(a => a.ToResponse()).ToList();
    }

    private async Task<EvaluatorScholarshipApplicationDetailResponse> BuildResponseAsync(
        EvaluatorScholarshipApplicationDetail detail,
        CancellationToken cancellationToken)
    {
        var documents = await _documentRepository.GetByUserIdAsync(detail.UserId, cancellationToken);
        return detail.ToResponse(documents);
    }
}
