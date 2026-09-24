namespace BCAS.Api.Constants;

public static class ReportTrendConstants
{
    public const int DefaultTrendWeeks = 12;
    public const int MaxTrendWeeks = 52;

    /// <summary>Funnel stage order for Admission - mirrors AdmissionWorkflowConstants' ranking without exposing its private StageRank dictionary.</summary>
    public static readonly IReadOnlyList<string> AdmissionFunnelStages = new[] { "Submitted", "UnderReview", "Approved", "Rejected" };

    /// <summary>Funnel stage order for Scholarship - mirrors ScholarshipWorkflowConstants.Stages plus the final decision. Waitlisted is intentionally excluded - it's a holding state outside the ordered pipeline, not a funnel stage.</summary>
    public static readonly IReadOnlyList<string> ScholarshipFunnelStages =
        new[] { "Submitted", "DocumentsVerified", "EligibilityScreening", "Evaluation", "Result", "Approved", "Rejected" };
}
