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
}
