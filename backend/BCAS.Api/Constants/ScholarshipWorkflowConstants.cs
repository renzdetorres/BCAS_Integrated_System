namespace BCAS.Api.Constants;

public static class ScholarshipWorkflowConstants
{
    /// <summary>
    /// Ordered stages an Evaluator moves a scholarship application through
    /// (BISAASS-43). The final decision (Approved/Rejected) is a separate,
    /// later step (BISAASS-47, Academic Head approval) - Result is as far
    /// as this workflow advances an application.
    /// </summary>
    public static readonly IReadOnlyList<string> Stages = new[]
    {
        "Submitted",
        "DocumentsVerified",
        "EligibilityScreening",
        "Evaluation",
        "Result",
    };

    /// <summary>
    /// The full range ScholarshipApplications.Status can hold - Stages plus
    /// the final Approved/Rejected decision (BISAASS-47) - matching
    /// CK_ScholarshipApplications_Status. Used by BISAASS-31's
    /// Admin-Registrar status override, which only checks that the target
    /// status is one of these at all - IsForwardTransition (BISAASS-56/57)
    /// is the further check that reaching it from the current status makes
    /// sense.
    /// </summary>
    public static readonly IReadOnlySet<string> AllowedStatuses = new HashSet<string>(StringComparer.Ordinal)
    {
        "Submitted",
        "DocumentsVerified",
        "EligibilityScreening",
        "Evaluation",
        "Result",
        "Approved",
        "Rejected",
    };

    private static readonly IReadOnlyDictionary<string, int> StageRank = new Dictionary<string, int>(StringComparer.Ordinal)
    {
        ["Submitted"] = 0,
        ["DocumentsVerified"] = 1,
        ["EligibilityScreening"] = 2,
        ["Evaluation"] = 3,
        ["Result"] = 4,
        ["Approved"] = 5,
        ["Rejected"] = 5,
    };

    /// <summary>
    /// Enforces the ordered scholarship workflow (BISAASS-57): Submitted ->
    /// DocumentsVerified -> EligibilityScreening -> Evaluation -> Result ->
    /// Approved|Rejected. True only if nextStatus is a real forward move
    /// from currentStatus: both must be known statuses, currentStatus must
    /// not already be a final decision (Approved/Rejected are terminal),
    /// and nextStatus must rank strictly later. Used by
    /// AdminApplicationsService.UpdateStatusAsync (its Admin override, like
    /// Admission's, previously let a Scholarship application's status move
    /// to any allowed value regardless of order); the Evaluator's own
    /// AdvanceWorkflowAsync/RecordFinalDecisionAsync already enforce this
    /// same order a different way (adjacent-step-only, via Stages).
    /// </summary>
    public static bool IsForwardTransition(string currentStatus, string nextStatus)
    {
        if (!StageRank.TryGetValue(currentStatus, out var currentRank) || !StageRank.TryGetValue(nextStatus, out var nextRank))
        {
            return false;
        }

        return currentRank < 5 && nextRank > currentRank;
    }
}
