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
}
