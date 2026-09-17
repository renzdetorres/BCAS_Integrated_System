namespace BCAS.Api.Models;

public class AdmissionApplicationTrackingResponse
{
    public Guid ApplicationId { get; set; }
    public string ApplicationType { get; set; } = string.Empty;
    public string CourseAppliedFor { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public IReadOnlyList<TrackingStepResponse> Steps { get; set; } = Array.Empty<TrackingStepResponse>();
    public DateTime SubmittedAt { get; set; }
}
