using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IApplicantProfileService
{
    Task<ApplicantProfileResponse?> GetMyProfileAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<ApplicantProfileResponse> SaveMyProfileAsync(
        Guid userId,
        UpsertApplicantProfileRequest request,
        CancellationToken cancellationToken = default);
}
