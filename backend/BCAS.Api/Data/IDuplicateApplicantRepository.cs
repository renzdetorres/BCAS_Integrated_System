using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface IDuplicateApplicantRepository
{
    /// <summary>
    /// Every existing Applicant (excluding excludeUserId) whose first and
    /// last name both score at or above DuplicateApplicantConstants.
    /// NameDifferenceThreshold (SQL Server's SOUNDEX-based DIFFERENCE())
    /// against the given name.
    /// </summary>
    Task<IReadOnlyList<(Guid UserId, string FirstName, string LastName, string Email)>> FindNameMatchesAsync(
        string firstName, string lastName, Guid excludeUserId, CancellationToken cancellationToken = default);

    Task InsertFlagAsync(Guid newUserId, Guid matchedUserId, string matchReason, CancellationToken cancellationToken = default);

    /// <summary>Every flag still awaiting review, most recently detected first.</summary>
    Task<IReadOnlyList<PotentialDuplicateApplicant>> GetOpenFlagsAsync(CancellationToken cancellationToken = default);

    /// <summary>Null if no flag exists with that id.</summary>
    Task<PotentialDuplicateApplicant?> ResolveFlagAsync(
        Guid flagId, string status, string? notes, Guid reviewedByUserId, CancellationToken cancellationToken = default);
}
