using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface IApplicantProfileRepository
{
    Task<ApplicantProfile?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<bool> ExistsAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<ApplicantProfile> UpsertAsync(
        Guid userId,
        UpsertApplicantProfileRequest request,
        CancellationToken cancellationToken = default);
}
