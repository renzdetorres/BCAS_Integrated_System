using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface IScholarshipApplicationRepository
{
    /// <summary>
    /// Reserves a slot and inserts the application as "Submitted" if one's
    /// available, or inserts it as "Waitlisted" (no slot consumed) if the
    /// scholarship is active but full. Throws ScholarshipNotFoundException
    /// if no such scholarship exists, or ScholarshipNotAvailableException
    /// if it's inactive.
    /// </summary>
    Task<ScholarshipApplication> CreateAsync(
        Guid userId,
        int scholarshipId,
        decimal gradeAverage,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ScholarshipApplication>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Releases a slot (RemainingSlots + 1, capped at TotalSlots) back to
    /// the scholarship behind the given application - call exactly once,
    /// when that application is rejected. A no-op if there's nothing to
    /// release (e.g. it was Waitlisted and never held a slot).
    /// </summary>
    Task ReleaseSlotByApplicationIdAsync(Guid applicationId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Atomically reserves a slot and flips a "Waitlisted" application to
    /// "Submitted". Returns null if the application doesn't exist or isn't
    /// currently "Waitlisted"; throws ScholarshipNotAvailableException if
    /// its scholarship still has no free slot.
    /// </summary>
    Task<ScholarshipApplication?> PromoteFromWaitlistAsync(Guid applicationId, CancellationToken cancellationToken = default);
}
