namespace BCAS.Api.Models;

/// <summary>
/// Headline counts for one category of applications. Named for admission
/// (BISAASS-37) but also used for the scholarship summary, where Pending
/// means anything not yet Approved or Rejected.
/// </summary>
public class AdmissionAnalytics
{
    public int TotalApplications { get; set; }

    /// <summary>Distinct applicants with at least one application.</summary>
    public int TotalApplicants { get; set; }

    /// <summary>Not yet decided.</summary>
    public int PendingCount { get; set; }
    public int ApprovedCount { get; set; }
    public int RejectedCount { get; set; }

    /// <summary>Submitted in the last 7 days.</summary>
    public int SubmittedThisWeek { get; set; }

    /// <summary>No department yet - invisible to every Academic Head.</summary>
    public int UnassignedCount { get; set; }
}
