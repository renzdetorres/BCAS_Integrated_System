using BCAS.Api.Models;

namespace BCAS.Api.Services;

/// <summary>Admin-Registrar scholarship slot management (BISAASS-32).</summary>
public interface IAdminScholarshipsService
{
    /// <summary>Every scholarship regardless of active status, with remaining/occupied slot counts.</summary>
    Task<IReadOnlyList<AdminScholarshipResponse>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<AdminScholarshipResponse> CreateAsync(CreateScholarshipRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Throws ScholarshipNotFoundException if no scholarship with that id
    /// exists, or InvalidTotalSlotsException if the new TotalSlots would
    /// fall below the number of slots already occupied. During an ongoing
    /// semester throws ScholarshipLockedException, unless forcedByUserId is
    /// a Super Admin (else SuperAdminRequiredException).
    /// </summary>
    Task<AdminScholarshipResponse> UpdateAsync(
        int scholarshipId, UpdateScholarshipRequest request, Guid? forcedByUserId = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Activates or deactivates a scholarship. A deactivated scholarship
    /// immediately stops appearing in the applicant-facing catalog
    /// (IScholarshipRepository.GetAvailableAsync already filters on
    /// IsActive) and new applications against it are rejected
    /// (ScholarshipApplicationService already checks IsActive) - no
    /// further change was needed for either of those. Deactivating is
    /// locked during an ongoing semester, with the same Super Admin
    /// override as UpdateAsync; activating never is.
    /// </summary>
    Task<AdminScholarshipResponse> SetActiveStatusAsync(
        int scholarshipId, bool isActive, Guid? forcedByUserId = null, CancellationToken cancellationToken = default);
}
