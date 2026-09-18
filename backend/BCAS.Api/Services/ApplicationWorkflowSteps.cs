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

    public static IReadOnlyList<TrackingStepResponse> BuildAdmissionSteps(
        string status, bool documentsReceived, bool examScheduled)
    {
        var decided = DecidedStatuses.Contains(status);
        var underReview = ReviewingOrDecidedStatuses.Contains(status);

        // Highest-indexed signal that's true wins - some of these
        // (UnderReview, ExamCompleted) currently only ever fire together
        // with a decision, since nothing sets them individually yet.
        var currentIndex = 0;
        if (documentsReceived) currentIndex = 1;
        if (underReview) currentIndex = 2;
        if (examScheduled) currentIndex = 3;
        if (decided) currentIndex = 5; // ExamCompleted (4) and DecisionReleased (5) both follow from a decision being out.

        return BuildSteps(ApplicationTrackingConstants.AdmissionSteps, currentIndex);
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
