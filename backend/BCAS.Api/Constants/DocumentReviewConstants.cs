namespace BCAS.Api.Constants;

public static class DocumentReviewConstants
{
    public static readonly IReadOnlySet<string> AllowedStatuses = new HashSet<string>(StringComparer.Ordinal)
    {
        "Verified",
        "Rejected",
        "Flagged",
    };

    /// <summary>Rejecting or flagging a document requires a reason (BISAASS-52); approving one doesn't.</summary>
    public static readonly IReadOnlySet<string> ReasonRequiredStatuses = new HashSet<string>(StringComparer.Ordinal)
    {
        "Rejected",
        "Flagged",
    };

    /// <summary>
    /// The ordered document lifecycle's non-final statuses (BISAASS-58):
    /// still open for a review decision. Verified and Rejected are the
    /// lifecycle's two terminal states - once reached, only a fresh upload
    /// (which resets Status to Pending - ApplicantDocumentRepository.
    /// UpsertAsync) reopens the document for another review. Flagged stays
    /// reviewable rather than terminal, since it means "needs a closer
    /// look", not "decided" - SupportStaffDocumentsService.
    /// ReviewDocumentAsync and the Support Staff document queue's own
    /// REVIEWABLE_STATUSES (SupportStaffDocumentsPage.jsx) both key off
    /// this same pair, keeping the applicant-facing and staff-facing views
    /// reading from the same source of truth.
    /// </summary>
    public static readonly IReadOnlySet<string> ReviewableStatuses = new HashSet<string>(StringComparer.Ordinal)
    {
        "Pending",
        "Flagged",
    };
}
