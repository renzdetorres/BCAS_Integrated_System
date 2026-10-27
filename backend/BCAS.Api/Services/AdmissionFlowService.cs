using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

/// <summary>One thing the automatic flow should have done for an application but has not (yet).</summary>
/// <param name="Code">DocumentsNotCompleted, DocumentsNotCleared, PermitNotReleased or PermitNeedsInvoice.</param>
/// <param name="CanFix">True when running the automatic steps again can resolve it.</param>
public sealed record AdmissionFlowIssue(string Code, string Message, bool CanFix);

/// <summary>What running the automatic steps by hand did: what moved, and what still could not.</summary>
public sealed record AdmissionFlowRunResult(IReadOnlyList<string> Done, IReadOnlyList<string> Problems);

/// <summary>
/// The steps of the admission flow that happen on their own, so staff do not have to move an application
/// along by hand: documents uploaded, then verified, then (once the fee is paid and a slot is booked) the exam
/// permit. Each method is a best effort that never throws: it runs after the action that triggered it has
/// already succeeded, and an application that cannot move yet simply stays where it is for staff to handle.
/// </summary>
public interface IAdmissionFlowService
{
    /// <summary>An applicant uploaded a document: the application moves to review, and to "documents completed" once every required one is in.</summary>
    Task AfterDocumentUploadedAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>A document was approved, rejected or flagged: once every required document is verified the application moves to "documents cleared".</summary>
    Task AfterDocumentReviewedAsync(Guid userId, Guid reviewedByUserId, CancellationToken cancellationToken = default);

    /// <summary>Releases the entrance exam permit when the fee is verified (with its SI number), a slot is booked and the documents are verified.</summary>
    Task TryReleasePermitAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Compares an admission application's status with what its documents, payment and exam booking say it should be.
    /// Empty when it is where it should be (or is not an open admission application). Nothing is stored: it is worked out each time.
    /// </summary>
    Task<IReadOnlyList<AdmissionFlowIssue>> CheckAsync(Guid applicationId, CancellationToken cancellationToken = default);

    /// <summary>Runs the automatic steps for one application now, on behalf of staff, and says what happened - including why a step could not run.</summary>
    Task<AdmissionFlowRunResult> RunNowAsync(Guid applicationId, Guid staffUserId, CancellationToken cancellationToken = default);
}

public class AdmissionFlowService : IAdmissionFlowService
{
    private readonly IAdmissionApplicationRepository _applicationRepository;
    private readonly IApplicantDocumentService _documentService;
    private readonly IExamPaymentService _paymentService;
    private readonly IExamScheduleRepository _examScheduleRepository;
    private readonly IAdminApplicationsRepository _adminApplicationsRepository;
    private readonly Lazy<IAdminApplicationsService> _applicationsService;
    private readonly Lazy<IAdminExamPermitService> _permitService;
    private readonly ILogger<AdmissionFlowService> _logger;

    public AdmissionFlowService(
        IAdmissionApplicationRepository applicationRepository,
        IApplicantDocumentService documentService,
        IExamPaymentService paymentService,
        IExamScheduleRepository examScheduleRepository,
        IAdminApplicationsRepository adminApplicationsRepository,
        IServiceProvider services,
        ILogger<AdmissionFlowService> logger)
    {
        _adminApplicationsRepository = adminApplicationsRepository;
        _applicationRepository = applicationRepository;
        _documentService = documentService;
        _paymentService = paymentService;
        _examScheduleRepository = examScheduleRepository;
        // Resolved on first use: both of these depend on services that call this one.
        _applicationsService = new Lazy<IAdminApplicationsService>(() => services.GetRequiredService<IAdminApplicationsService>());
        _permitService = new Lazy<IAdminExamPermitService>(() => services.GetRequiredService<IAdminExamPermitService>());
        _logger = logger;
    }

    public async Task AfterDocumentUploadedAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        try
        {
            var application = await GetApplicationAsync(userId, cancellationToken);
            if (application is null) return;

            var required = await GetRequiredDocumentsAsync(userId, cancellationToken);
            if (required is null) return;

            // A rejected document still has to be replaced, so it does not count as in.
            var complete = required.Count > 0 && required.All(r => r.Status is not ("NotSubmitted" or "Rejected"));
            await AdvanceAsync(
                application,
                complete ? "DocumentsCompleted" : "UnderReview",
                complete ? "Every required document was uploaded (automatic)" : "The applicant started uploading documents (automatic)",
                userId,
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Automatic status step after a document upload failed for {UserId}", userId);
        }
    }

    public async Task AfterDocumentReviewedAsync(Guid userId, Guid reviewedByUserId, CancellationToken cancellationToken = default)
    {
        try
        {
            var application = await GetApplicationAsync(userId, cancellationToken);
            if (application is null) return;

            var required = await GetRequiredDocumentsAsync(userId, cancellationToken);
            if (required is null || required.Count == 0) return;

            if (required.All(r => r.Status == "Verified"))
            {
                await AdvanceAsync(application, "DocumentsCleared", "Every required document was verified (automatic)", reviewedByUserId, cancellationToken);
            }
            else if (required.Any(r => r.Status is "Rejected" or "Flagged"))
            {
                // The applicant has something to fix; "pending documents" tells them so on the tracker.
                await AdvanceAsync(application, "PendingDocuments", "A document needs to be uploaded again (automatic)", reviewedByUserId, cancellationToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Automatic status step after a document review failed for {UserId}", userId);
        }
    }

    public async Task TryReleasePermitAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        try
        {
            var selection = await _examScheduleRepository.GetSelectionByUserIdAsync(userId, cancellationToken);
            if (selection is null || selection.IsPermitReleased || selection.ExamType != ExamTypes.Entrance) return;

            // The person who verified the payment is recorded as the one who released the permit.
            var payment = await _paymentService.GetVerifiedAsync(userId, cancellationToken);
            if (payment?.VerifiedByUserId is not { } releasedBy) return;

            await _permitService.Value.ReleaseAsync(userId, releasedBy, payment.InvoiceNumber ?? string.Empty, cancellationToken);
        }
        catch (Exception ex) when (ex is DocumentsNotVerifiedException or PaymentNotVerifiedException or InvoiceNumberRequiredException or NoExamScheduleSelectedException)
        {
            // Something is still missing (most often the SI number): staff can release the permit by hand.
            _logger.LogInformation("Exam permit for {UserId} was not released automatically: {Reason}", userId, ex.GetType().Name);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Automatic exam permit release failed for {UserId}", userId);
        }
    }

    public async Task<IReadOnlyList<AdmissionFlowIssue>> CheckAsync(Guid applicationId, CancellationToken cancellationToken = default)
    {
        var issues = new List<AdmissionFlowIssue>();

        var item = await _adminApplicationsRepository.GetByIdAsync(applicationId, cancellationToken);
        if (item is null || item.Category != "Admission" || AdmissionWorkflowConstants.IsFinal(item.Status)) return issues;

        var steps = AdmissionWorkflowConstants.Steps.ToList();
        var index = steps.IndexOf(item.Status);
        if (index < 0) return issues; // a side status such as DidNotTakeExam is handled by staff

        var required = await GetRequiredDocumentsAsync(item.UserId, cancellationToken);
        if (required is null || required.Count == 0) return issues;

        var allVerified = required.All(r => r.Status == "Verified");
        var allUploaded = required.All(r => r.Status is not ("NotSubmitted" or "Rejected"));

        if (allVerified && index < steps.IndexOf("DocumentsCleared"))
        {
            issues.Add(new AdmissionFlowIssue(
                "DocumentsNotCleared",
                $"Every required document is verified, but the status is still {StatusText(item.Status)}.",
                CanFix: true));
        }
        else if (allUploaded && index < steps.IndexOf("DocumentsCompleted"))
        {
            issues.Add(new AdmissionFlowIssue(
                "DocumentsNotCompleted",
                $"Every required document is uploaded, but the status is still {StatusText(item.Status)}.",
                CanFix: true));
        }

        var selection = await _examScheduleRepository.GetSelectionByUserIdAsync(item.UserId, cancellationToken);
        if (selection is not null && !selection.IsPermitReleased && selection.ExamType == ExamTypes.Entrance && allVerified)
        {
            var payment = await _paymentService.GetVerifiedAsync(item.UserId, cancellationToken);
            if (payment is not null)
            {
                issues.Add(payment.VerifiedByUserId is not null && !string.IsNullOrWhiteSpace(payment.InvoiceNumber)
                    ? new AdmissionFlowIssue(
                        "PermitNotReleased",
                        "The payment is verified and a slot is booked, but the exam permit has not been released.",
                        CanFix: true)
                    : new AdmissionFlowIssue(
                        "PermitNeedsInvoice",
                        "The payment is verified and a slot is booked, but the SI number is missing, so the exam permit was not released. Save the SI number on the payment to release it.",
                        CanFix: false));
            }
        }

        return issues;
    }

    public async Task<AdmissionFlowRunResult> RunNowAsync(Guid applicationId, Guid staffUserId, CancellationToken cancellationToken = default)
    {
        var done = new List<string>();
        var problems = new List<string>();

        var item = await _adminApplicationsRepository.GetByIdAsync(applicationId, cancellationToken);
        if (item is null || item.Category != "Admission")
        {
            problems.Add("This is not an admission application.");
            return new AdmissionFlowRunResult(done, problems);
        }

        var application = (await _applicationRepository.GetByUserIdAsync(item.UserId, cancellationToken))
            .FirstOrDefault(a => a.ApplicationId == applicationId);
        var required = await GetRequiredDocumentsAsync(item.UserId, cancellationToken);

        if (application is not null && required is { Count: > 0 })
        {
            var target = required.All(r => r.Status == "Verified")
                ? "DocumentsCleared"
                : required.All(r => r.Status is not ("NotSubmitted" or "Rejected")) ? "DocumentsCompleted" : null;

            if (target is not null)
            {
                try
                {
                    var before = application.Status;
                    await AdvanceAsync(application, target, "Moved automatically (run by staff)", staffUserId, cancellationToken);
                    var after = (await _adminApplicationsRepository.GetByIdAsync(applicationId, cancellationToken))?.Status;
                    if (after is not null && after != before) done.Add($"Status moved to {StatusText(after)}.");
                }
                catch (Exception ex) when (ex is StatusPreconditionNotMetException or InvalidStatusTransitionException)
                {
                    problems.Add(ex.Message);
                }
            }
            else
            {
                problems.Add("Not every required document is uploaded and not yet decided, so the status cannot move.");
            }
        }

        var selection = await _examScheduleRepository.GetSelectionByUserIdAsync(item.UserId, cancellationToken);
        if (selection is { IsPermitReleased: false } && selection.ExamType == ExamTypes.Entrance)
        {
            var payment = await _paymentService.GetVerifiedAsync(item.UserId, cancellationToken);
            if (payment?.VerifiedByUserId is { } releasedBy)
            {
                try
                {
                    await _permitService.Value.ReleaseAsync(item.UserId, releasedBy, payment.InvoiceNumber ?? string.Empty, cancellationToken);
                    done.Add("The exam permit was released.");
                }
                catch (DocumentsNotVerifiedException)
                {
                    problems.Add("The exam permit was not released: the required documents are not all verified.");
                }
                catch (InvoiceNumberRequiredException)
                {
                    problems.Add("The exam permit was not released: save the SI number on the payment first.");
                }
                catch (PaymentNotVerifiedException)
                {
                    problems.Add("The exam permit was not released: the payment is not verified.");
                }
            }
        }

        return new AdmissionFlowRunResult(done, problems);
    }

    private static string StatusText(string status) => AdmissionStatusLabels.TryGetValue(status, out var label) ? label : status;

    private static readonly IReadOnlyDictionary<string, string> AdmissionStatusLabels = new Dictionary<string, string>(StringComparer.Ordinal)
    {
        ["Submitted"] = "Submitted",
        ["UnderReview"] = "Under Review",
        ["PendingDocuments"] = "Pending Documents",
        ["DocumentsCompleted"] = "Documents Completed",
        ["DocumentsCleared"] = "Documents Cleared",
        ["ExamScheduled"] = "Exam Scheduled",
        ["ExamDone"] = "Exam Done",
        ["Registration"] = "Registration",
    };

    private async Task<AdmissionApplication?> GetApplicationAsync(Guid userId, CancellationToken cancellationToken) =>
        (await _applicationRepository.GetByUserIdAsync(userId, cancellationToken)).FirstOrDefault();

    /// <summary>The required documents (SF10 is only handed in after the exam, so it is left out), or null when the applicant has no admission checklist.</summary>
    private async Task<List<DocumentChecklistItemResponse>?> GetRequiredDocumentsAsync(Guid userId, CancellationToken cancellationToken)
    {
        try
        {
            var checklist = await _documentService.GetMyChecklistAsync(userId, cancellationToken);
            return checklist.Requirements.Where(r => r.DocumentType != DocumentConstants.Sf10).ToList();
        }
        catch (NoAdmissionApplicationException)
        {
            return null;
        }
    }

    /// <summary>Moves the application forward, one workflow step at a time so every step lands in its status history. Never moves it backwards or past a final status.</summary>
    private async Task AdvanceAsync(AdmissionApplication application, string target, string remarks, Guid changedByUserId, CancellationToken cancellationToken)
    {
        var steps = AdmissionWorkflowConstants.Steps;
        var from = steps.ToList().IndexOf(application.Status);
        var to = steps.ToList().IndexOf(target);
        if (from < 0 || to <= from) return;

        for (var i = from + 1; i <= to; i++)
        {
            await _applicationsService.Value.UpdateStatusAsync(
                application.ApplicationId,
                new UpdateApplicationStatusRequest { Category = "Admission", Status = steps[i], Remarks = remarks, SuppressNotification = true },
                changedByUserId,
                cancellationToken);
        }
    }
}
