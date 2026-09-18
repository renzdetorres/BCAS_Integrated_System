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
    /// Admin-Registrar status override, which (unlike the Evaluator's
    /// forward-only AdvanceWorkflowAsync) can set an application to any of
    /// these.
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
}
