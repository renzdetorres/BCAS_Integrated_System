namespace BCAS.Api.Models;

public class ScholarshipApplicationTrackingResponse
{
    public Guid ApplicationId { get; set; }
    public string ScholarshipName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public IReadOnlyList<TrackingStepResponse> Steps { get; set; } = Array.Empty<TrackingStepResponse>();
    /// <summary>The sub-process inside the current stage (e.g. "Qualified for interview / essay").</summary>
    public string? SubProcess { get; set; }

    public string? NextAction { get; set; }
    public string? NextActionPath { get; set; }
    public DateTime SubmittedAt { get; set; }
}
