using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IScholarshipApplicationService
{
    Task<ScholarshipApplicationResponse> SubmitAsync(
        Guid userId,
        SubmitScholarshipApplicationRequest request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ScholarshipApplicationResponse>> GetMyApplicationsAsync(Guid userId, CancellationToken cancellationToken = default);
}
