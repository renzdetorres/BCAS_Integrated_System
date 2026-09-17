using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface IScholarshipApplicationRepository
{
    /// <summary>
    /// Atomically reserves a slot on the given scholarship and inserts the
    /// application. Throws ScholarshipNotFoundException if no such
    /// scholarship exists, or ScholarshipNotAvailableException if it's
    /// inactive or has no remaining slots.
    /// </summary>
    Task<ScholarshipApplication> CreateAsync(
        Guid userId,
        int scholarshipId,
        decimal gradeAverage,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ScholarshipApplication>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
}
