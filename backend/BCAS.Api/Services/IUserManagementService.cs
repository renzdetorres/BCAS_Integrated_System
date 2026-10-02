using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IUserManagementService
{
    Task<IReadOnlyList<UserProfileResponse>> ListUsersAsync(CancellationToken cancellationToken = default);

    Task<UserProfileResponse> SetActiveStatusAsync(Guid userId, bool isActive, CancellationToken cancellationToken = default);

    /// <summary>
    /// Edits an existing account's name, email, and role. Works across all
    /// five roles, unlike staff provisioning which only creates staff
    /// accounts. Throws InvalidRoleException, UserNotFoundException, or
    /// DuplicateEmailException.
    /// </summary>
    Task<UserProfileResponse> UpdateUserAsync(Guid userId, UpdateUserRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Grants or revokes Super Admin on an active Admin account. Caller must
    /// be a Super Admin (SuperAdminRequiredException); the last active Super
    /// Admin can't be revoked (InvalidSuperAdminChangeException).
    /// </summary>
    Task<UserProfileResponse> SetSuperAdminAsync(Guid callerUserId, Guid userId, bool isSuperAdmin, CancellationToken cancellationToken = default);
}
