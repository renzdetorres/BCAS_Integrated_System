namespace BCAS.Api.Constants;

/// <summary>
/// The ordered admission workflow. Staff move an application one step at a
/// time along <see cref="Steps"/>; Rejected and Retracted are open to any
/// application that is not yet final; DidNotTakeExam is a side branch off
/// ExamScheduled that can return to it. Approved, Rejected and Retracted are
/// final - nothing changes after them. AdminApplicationsService uses
/// IsAllowedTransition to refuse any other change (skipping ahead, going
/// back, repeating the current status).
/// </summary>
public static class AdmissionWorkflowConstants
{
    /// <summary>The main path, earliest to latest.</summary>
    public static readonly IReadOnlyList<string> Steps = new[]
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

    public const string Rejected = "Rejected";
    public const string Retracted = "Retracted";
    public const string DidNotTakeExam = "DidNotTakeExam";

    private static readonly IReadOnlySet<string> Final = new HashSet<string>(StringComparer.Ordinal) { "Approved", Rejected, Retracted };

    public static bool IsFinal(string status) => Final.Contains(status);

    /// <summary>Every status an application in currentStatus may be moved to. Empty once it is final or unknown.</summary>
    public static IReadOnlyList<string> NextStatuses(string currentStatus)
    {
        if (IsFinal(currentStatus)) return Array.Empty<string>();

        var next = new List<string>();
        var index = IndexOf(currentStatus);
        if (index >= 0)
        {
            next.Add(Steps[index + 1]);
            if (currentStatus == "ExamScheduled") next.Add(DidNotTakeExam);
        }
        else if (currentStatus == DidNotTakeExam)
        {
            next.Add("ExamScheduled");
        }
        else
        {
            return Array.Empty<string>();
        }

        next.Add(Rejected);
        next.Add(Retracted);
        return next;
    }

    public static bool IsAllowedTransition(string currentStatus, string nextStatus) =>
        NextStatuses(currentStatus).Contains(nextStatus);

    /// <summary>Kept for existing callers: true when nextStatus is a permitted move from currentStatus.</summary>
    public static bool IsForwardTransition(string currentStatus, string nextStatus) => IsAllowedTransition(currentStatus, nextStatus);

    private static int IndexOf(string status)
    {
        for (var i = 0; i < Steps.Count - 1; i++)
        {
            if (Steps[i] == status) return i;
        }

        return -1;
    }
}
