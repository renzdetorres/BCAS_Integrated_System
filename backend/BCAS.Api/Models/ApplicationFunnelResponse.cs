namespace BCAS.Api.Models;

/// <summary>
/// How many distinct applications ever reached each stage of the ordered
/// Admission/Scholarship workflow, in stage order - the drop-off between
/// two consecutive entries is how many never made it from one to the next.
/// </summary>
public class ApplicationFunnelResponse
{
    public IReadOnlyList<FunnelStageCountResponse> AdmissionFunnel { get; set; } = new List<FunnelStageCountResponse>();
    public IReadOnlyList<FunnelStageCountResponse> ScholarshipFunnel { get; set; } = new List<FunnelStageCountResponse>();
}

public class FunnelStageCountResponse
{
    public string Stage { get; set; } = string.Empty;
    public int Count { get; set; }
}
