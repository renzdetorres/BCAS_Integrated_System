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

    /// <summary>Entrance exam payments waiting for verification (Status = Pending).</summary>
    public int PendingPaymentsCount { get; set; }

    /// <summary>Entrance exam payments verified today.</summary>
    public int VerifiedPaymentsTodayCount { get; set; }

    /// <summary>Entrance exam payments currently rejected (the applicant has to upload a new proof).</summary>
    public int RejectedPaymentsCount { get; set; }

    /// <summary>Total Applicant-role accounts.</summary>
    public int TotalApplicants { get; set; }
}
