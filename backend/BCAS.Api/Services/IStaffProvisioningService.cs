using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IStaffProvisioningService
{
    Task<UserProfileResponse> CreateStaffAsync(Guid callerUserId, ProvisionStaffRequest request, CancellationToken cancellationToken = default);
}
