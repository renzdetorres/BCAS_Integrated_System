using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface ISupportStaffDocumentsService
{
    /// <summary>Every non-archived document awaiting review or currently flagged, most recently uploaded first.</summary>
    Task<IReadOnlyList<AdminDocumentListItemResponse>> GetPendingAndFlaggedAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Every non-archived document belonging to one applicant, regardless
    /// of status - used when navigating directly into Document
    /// Verification for a specific applicant from Applicant Records
    /// (BISAASS-53).
    /// </summary>
    Task<IReadOnlyList<AdminDocumentListItemResponse>> GetByApplicantAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Approves, rejects, or flags a document (BISAASS-52). Throws
    /// InvalidDocumentReviewStatusException if request.Status isn't
    /// Verified/Rejected/Flagged, DocumentReviewReasonRequiredException if
    /// Rejected/Flagged is missing a reason, or DocumentNotFoundException if
    /// no document with that id exists.
    /// </summary>
    Task<AdminDocumentListItemResponse> ReviewDocumentAsync(
        Guid documentId,
        Guid reviewedByUserId,
        ReviewDocumentRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>Document Archive browse screen (BISAASS-54) - every archived document, most recently updated first, optionally narrowed by search and/or documentType.</summary>
    Task<IReadOnlyList<AdminDocumentListItemResponse>> SearchArchivedAsync(
        string? search, string? documentType, CancellationToken cancellationToken = default);
}
