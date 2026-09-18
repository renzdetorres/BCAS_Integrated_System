using BCAS.Api.Models;

namespace BCAS.Api.Services;

/// <summary>
/// Academic Head scholarship slot management, gated behind an
/// authorization check (BISAASS-48). When authorized, behaves exactly like
/// IAdminScholarshipsService (BISAASS-32), which this wraps.
/// </summary>
public interface IAcademicHeadScholarshipsService
{
    /// <summary>Throws AcademicHeadNotAuthorizedException if Academic Head isn't currently authorized for slot management.</summary>
    Task<IReadOnlyList<AdminScholarshipResponse>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>Throws AcademicHeadNotAuthorizedException if Academic Head isn't currently authorized for slot management.</summary>
    Task<AdminScholarshipResponse> CreateAsync(CreateScholarshipRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Throws AcademicHeadNotAuthorizedException if Academic Head isn't
    /// currently authorized for slot management, ScholarshipNotFoundException
    /// if no scholarship with that id exists, or InvalidTotalSlotsException
    /// if the new TotalSlots would fall below the number of slots already
    /// occupied.
    /// </summary>
    Task<AdminScholarshipResponse> UpdateAsync(int scholarshipId, UpdateScholarshipRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Throws AcademicHeadNotAuthorizedException if Academic Head isn't
    /// currently authorized for slot management, or
    /// ScholarshipNotFoundException if no scholarship with that id exists.
    /// </summary>
    Task<AdminScholarshipResponse> SetActiveStatusAsync(int scholarshipId, bool isActive, CancellationToken cancellationToken = default);
}
