namespace BCAS.Api.Models;

public class AdminDashboardResponse
{
    public int TotalApplications { get; set; }
    public int TotalApplicants { get; set; }
    public int PendingCount { get; set; }
    public int ApprovedCount { get; set; }
    public int RejectedCount { get; set; }
    public IReadOnlyList<ProgramCountResponse> ByProgram { get; set; } = Array.Empty<ProgramCountResponse>();
    public IReadOnlyList<RecentApplicationResponse> RecentApplications { get; set; } = Array.Empty<RecentApplicationResponse>();
}
