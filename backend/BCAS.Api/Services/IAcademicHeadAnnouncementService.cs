using BCAS.Api.Models;

namespace BCAS.Api.Services;

/// <summary>
/// Academic Head announcements management, gated behind an authorization
/// check (BISAASS-48). When authorized, behaves exactly like
/// IAdminAnnouncementService (BISAASS-36), which this wraps.
/// </summary>
public interface IAcademicHeadAnnouncementService
{
    /// <summary>Throws AcademicHeadNotAuthorizedException if Academic Head isn't currently authorized for announcement management.</summary>
    Task<IReadOnlyList<AdminAnnouncementResponse>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Throws AcademicHeadNotAuthorizedException if Academic Head isn't
    /// currently authorized for announcement management, or
    /// InvalidAnnouncementCategoryException if request.Category isn't
    /// Admission/Scholarship.
    /// </summary>
    Task<AdminAnnouncementResponse> CreateAsync(CreateAnnouncementRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Throws AcademicHeadNotAuthorizedException if Academic Head isn't
    /// currently authorized for announcement management, or
    /// AnnouncementNotFoundException if no announcement with that id exists.
    /// </summary>
    Task<AdminAnnouncementResponse> SetActiveStatusAsync(int announcementId, bool isActive, CancellationToken cancellationToken = default);
}
