using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class SupportStaffDocumentsService : ISupportStaffDocumentsService
{
    private readonly ISupportStaffDocumentsRepository _documentsRepository;
    private readonly INotificationDispatchService _notificationDispatchService;
    private readonly IApplicantDocumentService _applicantDocumentService;

    public SupportStaffDocumentsService(
        ISupportStaffDocumentsRepository documentsRepository,
        INotificationDispatchService notificationDispatchService,
        IApplicantDocumentService applicantDocumentService)
    {
        _applicantDocumentService = applicantDocumentService;
        _documentsRepository = documentsRepository;
        _notificationDispatchService = notificationDispatchService;
    }

    public async Task<IReadOnlyList<AdminDocumentListItemResponse>> GetPendingAndFlaggedAsync(CancellationToken cancellationToken = default)
    {
        var items = await _documentsRepository.GetPendingAndFlaggedAsync(cancellationToken);
        return items.Select(item => item.ToResponse()).ToList();
    }

    public async Task<IReadOnlyList<AdminDocumentListItemResponse>> GetByApplicantAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var items = await _documentsRepository.GetByUserIdAsync(userId, cancellationToken);
        return items.Select(item => item.ToResponse()).ToList();
    }

    public async Task<AdminDocumentListItemResponse> ReviewDocumentAsync(
        Guid documentId,
        Guid reviewedByUserId,
        ReviewDocumentRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!DocumentReviewConstants.AllowedStatuses.Contains(request.Status))
        {
            throw new InvalidDocumentReviewStatusException(request.Status);
        }

        var reason = string.IsNullOrWhiteSpace(request.Reason) ? null : request.Reason.Trim();

        if (DocumentReviewConstants.ReasonRequiredStatuses.Contains(request.Status) && reason is null)
        {
            throw new DocumentReviewReasonRequiredException(request.Status);
        }

        var existing = await _documentsRepository.GetByIdAsync(documentId, cancellationToken)
            ?? throw new DocumentNotFoundException(documentId);

        // The ordered document lifecycle (BISAASS-58): Pending ->
        // Verified/Flagged/Rejected, where Verified/Rejected are terminal
        // but Flagged stays reviewable (DocumentReviewConstants.
        // ReviewableStatuses) - only a fresh upload reopens a
        // Verified/Rejected document for another review.
        if (!DocumentReviewConstants.ReviewableStatuses.Contains(existing.Status))
        {
            throw new DocumentAlreadyReviewedException(documentId, existing.Status);
        }

        // A raced concurrent review (someone else reviewed it between the
        // GetByIdAsync above and this write) surfaces the same way - accurate
        // enough without a dedicated conflict exception for what's a rare,
        // low-stakes race here.
        var updated = await _documentsRepository.ReviewAsync(documentId, request.Status, reason, reviewedByUserId, cancellationToken)
            ?? throw new DocumentAlreadyReviewedException(documentId, existing.Status);

        // Document Flagged/Rejected notification (BISAASS-59) - Verified isn't part of this event.
        if (request.Status is "Flagged" or "Rejected")
        {
            var applicantFirstName = updated.ApplicantName.Split(' ', 2)[0];
            await _notificationDispatchService.NotifyDocumentReviewedAsync(
                updated.UserId, updated.ApplicantEmail, applicantFirstName, updated.DocumentType, request.Status, reason!, cancellationToken);
        }

        // Requirements Verified notification: sent once, by the review that completes the set.
        if (request.Status == "Verified")
        {
            await NotifyIfAllRequirementsVerifiedAsync(updated, cancellationToken);
        }

        return updated.ToResponse();
    }

    private async Task NotifyIfAllRequirementsVerifiedAsync(AdminDocumentListItem verified, CancellationToken cancellationToken)
    {
        try
        {
            var checklist = await _applicantDocumentService.GetMyChecklistAsync(verified.UserId, cancellationToken);

            // SF10 is only submitted after the exam, so it isn't part of "all requirements".
            var required = checklist.Requirements.Where(r => r.DocumentType != DocumentConstants.Sf10).ToList();
            if (required.Count > 0 && required.All(r => r.Status == "Verified") && required.Any(r => r.DocumentType == verified.DocumentType))
            {
                var firstName = verified.ApplicantName.Split(' ', 2)[0];
                await _notificationDispatchService.NotifyRequirementsVerifiedAsync(verified.UserId, verified.ApplicantEmail, firstName, cancellationToken);
            }
        }
        catch (NoAdmissionApplicationException)
        {
            // A scholarship-only applicant has no admission checklist to complete.
        }
    }

    public async Task<IReadOnlyList<AdminDocumentListItemResponse>> SearchArchivedAsync(
        string? search, string? documentType, CancellationToken cancellationToken = default)
    {
        var items = await _documentsRepository.SearchArchivedAsync(search, documentType, cancellationToken);
        return items.Select(item => item.ToResponse()).ToList();
    }

    public async Task<BulkOperationResultResponse> BulkReviewDocumentsAsync(
        BulkReviewDocumentsRequest request,
        Guid reviewedByUserId,
        CancellationToken cancellationToken = default)
    {
        if (!DocumentReviewConstants.AllowedStatuses.Contains(request.Status))
        {
            throw new InvalidDocumentReviewStatusException(request.Status);
        }

        var reason = string.IsNullOrWhiteSpace(request.Reason) ? null : request.Reason.Trim();

        if (DocumentReviewConstants.ReasonRequiredStatuses.Contains(request.Status) && reason is null)
        {
            throw new DocumentReviewReasonRequiredException(request.Status);
        }

        var perDocumentRequest = new ReviewDocumentRequest { Status = request.Status, Reason = reason };
        var failures = new List<BulkOperationFailure>();
        var succeededCount = 0;

        foreach (var documentId in request.DocumentIds)
        {
            try
            {
                await ReviewDocumentAsync(documentId, reviewedByUserId, perDocumentRequest, cancellationToken);
                succeededCount++;
            }
            catch (Exception ex) when (ex is DocumentNotFoundException or DocumentAlreadyReviewedException)
            {
                failures.Add(new BulkOperationFailure { Id = documentId, Reason = ex.Message });
            }
        }

        return new BulkOperationResultResponse { SucceededCount = succeededCount, Failures = failures };
    }
}
