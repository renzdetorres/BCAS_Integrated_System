namespace BCAS.Api.Models;

public class AdmissionApplicationTrackingResponse
{
    public Guid ApplicationId { get; set; }
    public string ApplicationType { get; set; } = string.Empty;
    public string CourseAppliedFor { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public IReadOnlyList<TrackingStepResponse> Steps { get; set; } = Array.Empty<TrackingStepResponse>();

    /// <summary>The internal sub-process running inside the current stage (e.g. "Document verification"). Null once the application is rejected or retracted.</summary>
    public string? SubProcess { get; set; }

    /// <summary>What the applicant should do or expect next, in plain words.</summary>
    public string? NextAction { get; set; }

    /// <summary>The page where the applicant takes that next action, when there is one (e.g. "/payment").</summary>
    public string? NextActionPath { get; set; }

    public DateTime SubmittedAt { get; set; }
}
