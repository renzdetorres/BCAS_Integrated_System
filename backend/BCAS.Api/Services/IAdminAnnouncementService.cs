using BCAS.Api.Models;

namespace BCAS.Api.Services;

/// <summary>Admin-Registrar announcements management (BISAASS-36).</summary>
public interface IAdminAnnouncementService
{
    /// <summary>Every announcement regardless of active status, most recently posted first.</summary>
    Task<IReadOnlyList<AdminAnnouncementResponse>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a new announcement as a draft - it does not appear to
    /// applicants until explicitly posted via SetActiveStatusAsync. Throws
    /// InvalidAnnouncementCategoryException if request.Category isn't
    /// Admission/Scholarship.
    /// </summary>
    Task<AdminAnnouncementResponse> CreateAsync(CreateAnnouncementRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Posts (activates) or deactivates an announcement. A deactivated
    /// announcement immediately stops appearing to applicants
    /// (IAnnouncementRepository.GetActiveAsync already filters on
    /// IsActive) - no further change was needed for that. Throws
    /// AnnouncementNotFoundException if no announcement with that id exists.
    /// </summary>
    Task<AdminAnnouncementResponse> SetActiveStatusAsync(int announcementId, bool isActive, CancellationToken cancellationToken = default);
}
