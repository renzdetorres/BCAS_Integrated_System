using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface ISupportStaffDocumentsRepository
{
    /// <summary>
    /// Every non-archived document awaiting review or currently flagged
    /// (Status = Pending or Flagged), most recently uploaded first. A
    /// read-only stub for the BISAASS-51 dashboard's "Document Verification"
    /// quick link - approve/reject/flag actions land with BISAASS-52.
    /// </summary>
    Task<IReadOnlyList<AdminDocumentListItem>> GetPendingAndFlaggedAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Every non-archived document belonging to one applicant, regardless
    /// of status, most recently uploaded first - used when Support Staff
    /// navigates directly into Document Verification for a specific
    /// applicant from Applicant Records (BISAASS-53).
    /// </summary>
    Task<IReadOnlyList<AdminDocumentListItem>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>One document by id regardless of status, or null if none exists - used to check its current status before reviewing it (BISAASS-58).</summary>
    Task<AdminDocumentListItem?> GetByIdAsync(Guid documentId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Approves (Verified), rejects, or flags a document, recording who
    /// reviewed it and when. Only applies while the document's status is
    /// still Pending or Flagged (BISAASS-58's ordered lifecycle - Verified/
    /// Rejected are terminal) - the caller checks this first via
    /// GetByIdAsync so it can report a clear DocumentAlreadyReviewedException,
    /// but the UPDATE itself also guards against a concurrent double-review.
    /// Returns the updated document, or null if no Pending/Flagged document
    /// with that id exists.
    /// </summary>
    Task<AdminDocumentListItem?> ReviewAsync(
        Guid documentId,
        string status,
        string? reason,
        Guid reviewedByUserId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Every archived document (IsArchived = 1), most recently updated
    /// first, optionally narrowed by search (applicant name/email) and/or
    /// documentType - the Document Archive browse screen (BISAASS-54),
    /// kept separate from the active verification queue above.
    /// </summary>
    Task<IReadOnlyList<AdminDocumentListItem>> SearchArchivedAsync(
        string? search, string? documentType, CancellationToken cancellationToken = default);
}
