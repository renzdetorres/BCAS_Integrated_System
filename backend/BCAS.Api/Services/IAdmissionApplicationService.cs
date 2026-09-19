using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IAdmissionApplicationService
{
    /// <summary>Also emails the applicant a confirmation (Application Received, BISAASS-59), subject to their own notification preference.</summary>
    Task<AdmissionApplicationResponse> SubmitAsync(
        Guid userId,
        SubmitAdmissionApplicationRequest request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AdmissionApplicationResponse>> GetMyApplicationsAsync(Guid userId, CancellationToken cancellationToken = default);
}
