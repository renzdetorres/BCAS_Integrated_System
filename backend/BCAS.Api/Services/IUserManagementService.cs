using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IUserManagementService
{
    Task<IReadOnlyList<UserProfileResponse>> ListUsersAsync(CancellationToken cancellationToken = default);

    Task<UserProfileResponse> SetActiveStatusAsync(Guid userId, bool isActive, CancellationToken cancellationToken = default);
}
