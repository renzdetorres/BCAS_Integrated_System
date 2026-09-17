using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IStaffProvisioningService
{
    Task<UserProfileResponse> CreateStaffAsync(ProvisionStaffRequest request, CancellationToken cancellationToken = default);
}
