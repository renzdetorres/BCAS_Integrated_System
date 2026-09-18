namespace BCAS.Api.Constants;

public static class AdmissionConstants
{
    public static readonly IReadOnlySet<string> AllowedApplicationTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "NewStudent",
        "Transferee",
    };

    /// <summary>
    /// The full range AdmissionApplications.Status can hold (BISAASS-16's
    /// CHECK constraint, widened up front to anticipate this ticket -
    /// BISAASS-31 Application Status Workflow Oversight & Update). Staff can
    /// set an application to any of these; the granular six-step view
    /// (Submitted/DocumentsReceived/UnderReview/ExamScheduled/ExamCompleted/
    /// DecisionReleased, BISAASS-22) is derived on top of this smaller set
    /// plus other signals - see ApplicationWorkflowSteps.
    /// </summary>
    public static readonly IReadOnlySet<string> AllowedStatuses = new HashSet<string>(StringComparer.Ordinal)
    {
        "Submitted",
        "UnderReview",
        "Approved",
        "Rejected",
    };
}
