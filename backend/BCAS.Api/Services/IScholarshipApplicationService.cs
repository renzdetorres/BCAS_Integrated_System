using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IScholarshipApplicationService
{
    /// <summary>Also emails the applicant a confirmation (Application Received, BISAASS-59), subject to their own notification preference.</summary>
    Task<ScholarshipApplicationResponse> SubmitAsync(
        Guid userId,
        SubmitScholarshipApplicationRequest request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ScholarshipApplicationResponse>> GetMyApplicationsAsync(Guid userId, CancellationToken cancellationToken = default);
}
