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
    /// The admission steps come straight from the application's status now
    /// that every step is a real status. Rejected and Retracted end the path
    /// without completing it, so no step is marked; DidNotTakeExam sits at the
    /// exam step.
    /// </summary>
    public static IReadOnlyList<TrackingStepResponse> BuildAdmissionSteps(string status)
    {
        var steps = ApplicationTrackingConstants.AdmissionSteps;
        if (status is "Rejected" or "Retracted")
        {
            return steps.Select(step => new TrackingStepResponse { Step = step }).ToList();
        }

        var lookup = status == AdmissionWorkflowConstants.DidNotTakeExam ? "ExamScheduled" : status;
        var currentIndex = Math.Max(0, steps.ToList().IndexOf(lookup));
        return BuildSteps(steps, currentIndex);
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
