namespace BCAS.Api.Constants;

/// <summary>
/// Enforces the ordered admission workflow (BISAASS-56): Submitted ->
/// UnderReview -> Approved|Rejected. AdminApplicationsService.
/// UpdateStatusAsync uses IsForwardTransition to reject a status change
/// that would move an Admission application backward, leave it unchanged,
/// or change it again once a final decision (Approved/Rejected) has been
/// recorded. This sits on top of AdmissionConstants.AllowedStatuses
/// (BISAASS-31), which only checks that the target status is one of the
/// four valid values at all, not that reaching it from the current status
/// makes sense.
/// </summary>
public static class AdmissionWorkflowConstants
{
    private static readonly IReadOnlyDictionary<string, int> StageRank = new Dictionary<string, int>(StringComparer.Ordinal)
    {
        ["Submitted"] = 0,
        ["UnderReview"] = 1,
        ["Approved"] = 2,
        ["Rejected"] = 2,
    };

    /// <summary>
    /// True only if nextStatus is a real forward move from currentStatus:
    /// both must be known statuses, currentStatus must not already be a
    /// final decision (Approved/Rejected are terminal), and nextStatus
    /// must rank strictly later. Same-status "changes" and any backward
    /// move both return false.
    /// </summary>
    public static bool IsForwardTransition(string currentStatus, string nextStatus)
    {
        if (!StageRank.TryGetValue(currentStatus, out var currentRank) || !StageRank.TryGetValue(nextStatus, out var nextRank))
        {
            return false;
        }

        return currentRank < 2 && nextRank > currentRank;
    }
}
