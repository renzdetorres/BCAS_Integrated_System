namespace BCAS.Api.Constants;

public static class ScholarshipFinalDecisionConstants
{
    public static readonly IReadOnlySet<string> AllowedDecisions = new HashSet<string>(StringComparer.Ordinal)
    {
        "Approved",
        "Rejected",
    };
}
