using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class SupportStaffDocumentsService : ISupportStaffDocumentsService
{
    private readonly ISupportStaffDocumentsRepository _documentsRepository;

    public SupportStaffDocumentsService(ISupportStaffDocumentsRepository documentsRepository)
    {
        _documentsRepository = documentsRepository;
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

        return updated.ToResponse();
    }

    public async Task<IReadOnlyList<AdminDocumentListItemResponse>> SearchArchivedAsync(
        string? search, string? documentType, CancellationToken cancellationToken = default)
    {
        var items = await _documentsRepository.SearchArchivedAsync(search, documentType, cancellationToken);
        return items.Select(item => item.ToResponse()).ToList();
    }
}
