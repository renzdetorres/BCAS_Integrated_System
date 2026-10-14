namespace BCAS.Api.Constants;

public static class ApplicationTrackingConstants
{
    /// <summary>
    /// The seven stages an applicant sees on the admission tracker, earliest
    /// to latest. Requirements verification, payment verification, exam
    /// scheduling, the exam itself, interview and result processing are
    /// sub-processes of these stages - they never appear as stages of their
    /// own. Staff keep the finer-grained AdmissionWorkflowConstants.Steps
    /// statuses; ApplicationWorkflowSteps maps each of those onto a stage.
    /// </summary>
    public static readonly IReadOnlyList<string> AdmissionSteps = new[]
    {
        "Submitted",
        "UnderReview",
        "ExamPayment",
        "ExamPermit",
        "ExamResult",
        "InterviewSchedule",
        "Enrollment",
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
