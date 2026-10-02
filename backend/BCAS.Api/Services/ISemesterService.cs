using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface ISemesterService
{
    Task<SemesterOverviewResponse> GetOverviewAsync(Guid callerUserId, CancellationToken cancellationToken = default);

    /// <summary>The semester in progress today (Philippine time), or null.</summary>
    Task<Semester?> GetOngoingAsync(CancellationToken cancellationToken = default);

    /// <summary>Super Admin only. Throws InvalidSemesterException for bad dates or an overlap.</summary>
    Task<SemesterResponse> CreateAsync(Guid callerUserId, CreateSemesterRequest request, CancellationToken cancellationToken = default);

    /// <summary>Super Admin only. Throws SemesterNotFoundException.</summary>
    Task DeleteAsync(Guid callerUserId, int semesterId, CancellationToken cancellationToken = default);
}
