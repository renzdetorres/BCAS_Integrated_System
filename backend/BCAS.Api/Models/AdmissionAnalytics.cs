namespace BCAS.Api.Models;

public class AdmissionAnalytics
{
    public int TotalApplications { get; set; }

    /// <summary>Distinct applicants with at least one admission application.</summary>
    public int TotalApplicants { get; set; }

    /// <summary>Submitted + UnderReview - not yet decided.</summary>
    public int PendingCount { get; set; }
    public int ApprovedCount { get; set; }
    public int RejectedCount { get; set; }
}
