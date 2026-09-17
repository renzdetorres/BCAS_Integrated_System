using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface IAdmissionApplicationRepository
{
    Task<AdmissionApplication> CreateAsync(
        Guid userId,
        SubmitAdmissionApplicationRequest request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AdmissionApplication>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
}
