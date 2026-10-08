namespace BCAS.Api.Constants;

public static class ApplicationTrackingConstants
{
    /// <summary>
    /// The Admission workflow (BISAASS-22). Ordered earliest to latest -
    /// index into this list is what ApplicationTrackingService uses to
    /// decide which steps are complete/current.
    /// </summary>
    public static readonly IReadOnlyList<string> AdmissionSteps = new[]
    {
        "Submitted",
        "UnderReview",
        "PendingDocuments",
        "DocumentsCompleted",
        "DocumentsCleared",
        "ExamScheduled",
        "ExamDone",
        "Registration",
        "Approved",
    };

    /// <summary>The Scholarship workflow (BISAASS-22), earliest to latest.</summary>
    public static readonly IReadOnlyList<string> ScholarshipSteps = new[]
    {
        "Submitted",
        "DocumentsVerified",
        "EligibilityScreening",
        "Evaluation",
        "Result",
    };
}
