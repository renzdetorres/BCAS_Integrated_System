using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

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
}

public class AdmissionFlowService : IAdmissionFlowService
{
    private readonly IAdmissionApplicationRepository _applicationRepository;
    private readonly IApplicantDocumentService _documentService;
    private readonly IExamPaymentService _paymentService;
    private readonly IExamScheduleRepository _examScheduleRepository;
    private readonly Lazy<IAdminApplicationsService> _applicationsService;
    private readonly Lazy<IAdminExamPermitService> _permitService;
    private readonly ILogger<AdmissionFlowService> _logger;

    public AdmissionFlowService(
        IAdmissionApplicationRepository applicationRepository,
        IApplicantDocumentService documentService,
        IExamPaymentService paymentService,
        IExamScheduleRepository examScheduleRepository,
        IServiceProvider services,
        ILogger<AdmissionFlowService> logger)
    {
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
