namespace BCAS.Api.Models;

/// <summary>Landing dashboard counts for the Support Staff role (BISAASS-51).</summary>
public class SupportStaffDashboardResponse
{
    /// <summary>Documents awaiting review (Status = Pending), excluding archived ones.</summary>
    public int PendingVerificationCount { get; set; }

    /// <summary>Documents verified today (Status = Verified, last updated today).</summary>
    public int VerifiedTodayCount { get; set; }

    /// <summary>Documents currently flagged (Status = Flagged), excluding archived ones.</summary>
    public int FlaggedDocsCount { get; set; }

    /// <summary>Total Applicant-role accounts.</summary>
    public int TotalApplicants { get; set; }
}
