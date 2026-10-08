namespace BCAS.Api.Constants;

public static class AdmissionConstants
{
    public static readonly IReadOnlySet<string> AllowedApplicationTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "NewStudent",
        "Transferee",
    };

    /// <summary>
    /// Every value AdmissionApplications.Status can hold (matches
    /// CK_AdmissionApplications_Status). Which of them an application may move
    /// to from where it is now is decided by AdmissionWorkflowConstants.
    /// </summary>
    public static readonly IReadOnlySet<string> AllowedStatuses = new HashSet<string>(StringComparer.Ordinal)
    {
        "Submitted",
        "UnderReview",
        "PendingDocuments",
        "DocumentsCompleted",
        "DocumentsCleared",
        "ExamScheduled",
        "ExamDone",
        "DidNotTakeExam",
        "Registration",
        "Approved",
        "Rejected",
        "Retracted",
    };
}
