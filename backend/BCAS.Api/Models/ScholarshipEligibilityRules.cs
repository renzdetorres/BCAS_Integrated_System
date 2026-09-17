namespace BCAS.Api.Models;

/// <summary>
/// Computed eligibility-rule facts for one scholarship application
/// (BISAASS-44). Nothing here is stored - it's assembled fresh on every
/// read from the applicant's profile, the scholarship's own settings, the
/// entrance-exam subsystem, and this applicant's own application history.
/// </summary>
public class ScholarshipEligibilityRules
{
    /// <summary>Top 1: free all - entrance exam and interview are waived.</summary>
    public bool IsTopOne { get; set; }

    /// <summary>
    /// Non-BCASian: entrance exam required, unless the scholarship is Top 1.
    /// Null if the applicant has no profile yet (BCASian status unknown).
    /// </summary>
    public bool? EntranceExamRequired { get; set; }

    /// <summary>True if the applicant has a confirmed entrance-exam schedule selection.</summary>
    public bool EntranceExamScheduled { get; set; }

    public int TotalSlots { get; set; }
    public int RemainingSlots { get; set; }

    /// <summary>True if the applicant has applied for this same scholarship before.</summary>
    public bool IsReapplication { get; set; }
    public IReadOnlyList<ScholarshipReapplicationAttempt> PreviousAttempts { get; set; } = Array.Empty<ScholarshipReapplicationAttempt>();
}
