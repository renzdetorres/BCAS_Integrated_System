using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IAdmissionApplicationService
{
    Task<AdmissionApplicationResponse> SubmitAsync(
        Guid userId,
        SubmitAdmissionApplicationRequest request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AdmissionApplicationResponse>> GetMyApplicationsAsync(Guid userId, CancellationToken cancellationToken = default);
}
