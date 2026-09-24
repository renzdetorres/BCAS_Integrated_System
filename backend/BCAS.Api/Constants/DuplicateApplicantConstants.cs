namespace BCAS.Api.Constants;

public static class DuplicateApplicantConstants
{
    /// <summary>
    /// Minimum SQL Server DIFFERENCE() score (0-4, SOUNDEX-based) that both
    /// the first and last name must reach against an existing Applicant for
    /// DuplicateApplicantService to flag a new registration as a potential
    /// duplicate. 4 is an exact SOUNDEX match; 3 still catches close
    /// variants (typos, nickname spellings) without matching on names that
    /// are only vaguely similar.
    /// </summary>
    public const int NameDifferenceThreshold = 3;

    /// <summary>Matches CK_PotentialDuplicateApplicants_Status.</summary>
    public static readonly IReadOnlySet<string> AllowedResolutionStatuses = new HashSet<string>(StringComparer.Ordinal)
    {
        "Dismissed",
        "ConfirmedDuplicate",
    };
}
