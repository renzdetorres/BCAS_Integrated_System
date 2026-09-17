namespace BCAS.Api.Models;

public class TrackingStepResponse
{
    public string Step { get; set; } = string.Empty;
    public bool IsComplete { get; set; }
    public bool IsCurrent { get; set; }
}
