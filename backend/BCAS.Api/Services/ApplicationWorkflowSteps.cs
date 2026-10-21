using BCAS.Api.Constants;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

/// <summary>
/// Builds the step-pill view (BISAASS-22) for an admission or scholarship
/// application's workflow. Shared by ApplicationTrackingService (an
/// applicant's own applications) and AdminApplicationsService (any
/// application, BISAASS-31) so the two never drift apart.
/// </summary>
public static class ApplicationWorkflowSteps
{
    private static readonly IReadOnlySet<string> DecidedStatuses = new HashSet<string>(StringComparer.Ordinal) { "Approved", "Rejected" };
    private static readonly IReadOnlySet<string> ReviewingOrDecidedStatuses = new HashSet<string>(StringComparer.Ordinal) { "UnderReview", "Approved", "Rejected" };

    /// <summary>
    /// What an applicant sees for one internal admission status: which of the
    /// seven tracker stages it falls in, the sub-process running inside that
    /// stage, and what happens next.
    /// </summary>
    /// <summary>The booked interview, when there is one - used to word the Interview stage.</summary>
    public sealed record InterviewSummary(DateOnly Date, TimeOnly Time, string Location);

    public sealed record AdmissionStage(int StageIndex, string SubProcess, string NextAction, string? NextActionPath = null);

    /// <summary>How an applicant's entrance exam payment stands, which decides where DocumentsCleared sits on the tracker.</summary>
    public static class PaymentState
    {
        public const string NotRequired = "NotRequired";
        public const string NotPaid = "NotPaid";
        public const string Pending = "Pending";
        public const string Verified = "Verified";
        public const string Rejected = "Rejected";
    }

    private static readonly IReadOnlyDictionary<string, AdmissionStage> AdmissionStages = new Dictionary<string, AdmissionStage>(StringComparer.Ordinal)
    {
        // Submitting is the applicant's own step, so it is already done: they wait in the review stage (stage 2 of 7).
        ["Submitted"] = new(1, "Waiting for review", "Your application is received. Upload your required documents so the review can begin.", "/documents"),
        ["UnderReview"] = new(1, "Application evaluation", "The registrar is reviewing your application and documents."),
        ["PendingDocuments"] = new(1, "Document verification", "Upload any missing or rejected documents so the review can continue.", "/documents"),
        ["DocumentsCompleted"] = new(1, "Document verification", "All your documents are in. Staff will verify them next."),
        ["ExamScheduled"] = new(3, "Exam scheduled", "Your exam is scheduled. Open your exam permit for the date, time and venue.", "/exam-permit"),
        [AdmissionWorkflowConstants.DidNotTakeExam] = new(3, "Exam missed", "You missed your entrance exam. The registrar will help you get a new schedule."),
        ["ExamDone"] = new(4, "Result processing", "You took the exam. Your result will be released soon.", "/exam-result"),
        ["Registration"] = new(5, "Interview scheduling", "You passed the exam. The school will set your interview schedule. Bring the original copies of your submitted documents to the interview.", "/interview"),
        ["Approved"] = new(6, "Ready for enrollment", "You passed admission. Proceed to enrollment with the registrar's office.", "/interview"),
    };

    /// <summary>
    /// The stage and sub-process for a status, or null when the application
    /// ended (Rejected, Retracted) or the status is unknown. Documents-cleared
    /// applicants sit in the payment stage until their payment is verified,
    /// then move on to the exam permit stage.
    /// </summary>
    public static AdmissionStage? DescribeAdmission(string status, string paymentState = PaymentState.NotRequired, InterviewSummary? interview = null)
    {
        if (status == "Registration" && interview is not null)
        {
            return new(5, "Interview", $"Your interview is on {interview.Date:MMMM d, yyyy} at {interview.Time:h:mm tt}, at {interview.Location}. Bring the original copies of your submitted documents.", "/interview");
        }

        if (status == "DocumentsCleared")
        {
            return paymentState switch
            {
                PaymentState.NotPaid => new(2, "Waiting for payment", "Your documents are verified. Pay the entrance exam fee and upload your proof of payment.", "/payment"),
                PaymentState.Pending => new(2, "Payment verification", "We received your proof of payment. Staff will verify it soon."),
                PaymentState.Rejected => new(2, "Payment rejected", "Your proof of payment was rejected. Upload a new, clear proof of payment.", "/payment"),
                PaymentState.Verified => new(3, "Payment verified", "Your payment is verified. Choose your entrance exam schedule.", "/exam-schedule"),
                _ => new(3, "Exam scheduling", "Your documents are verified. Choose your entrance exam schedule.", "/exam-schedule"),
            };
        }

        return AdmissionStages.TryGetValue(status, out var stage) ? stage : null;
    }

    /// <summary>
    /// The seven applicant-facing admission stages, derived from the
    /// application's internal status. Rejected and Retracted end the path
    /// without completing it, so no stage is marked.
    /// </summary>
    public static IReadOnlyList<TrackingStepResponse> BuildAdmissionSteps(string status, string paymentState = PaymentState.NotRequired, InterviewSummary? interview = null)
    {
        var steps = ApplicationTrackingConstants.AdmissionSteps;
        if (status is "Rejected" or "Retracted")
        {
            return steps.Select(step => new TrackingStepResponse { Step = step }).ToList();
        }

        return BuildSteps(steps, DescribeAdmission(status, paymentState, interview)?.StageIndex ?? 0);
    }

    public static IReadOnlyList<TrackingStepResponse> BuildScholarshipSteps(string status, bool documentsVerified)
    {
        var decided = DecidedStatuses.Contains(status);
        var underReview = ReviewingOrDecidedStatuses.Contains(status);

        var currentIndex = 0;
        if (documentsVerified) currentIndex = 1;
        if (underReview) currentIndex = 2;
        if (decided) currentIndex = 4; // Evaluation (3) and Result (4) both follow from a decision being out.

        return BuildSteps(ApplicationTrackingConstants.ScholarshipSteps, currentIndex);
    }

    private static IReadOnlyList<TrackingStepResponse> BuildSteps(IReadOnlyList<string> steps, int currentIndex) =>
        steps
            .Select((step, index) => new TrackingStepResponse
            {
                Step = step,
                IsComplete = index < currentIndex || (index == steps.Count - 1 && index == currentIndex),
                IsCurrent = index == currentIndex,
            })
            .ToList();
}
