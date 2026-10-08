using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class UserManagementService : IUserManagementService
{
    private readonly IUserRepository _userRepository;
    private readonly ISuperAdminGuard _superAdminGuard;
    private readonly ILogger<UserManagementService> _logger;

    public UserManagementService(IUserRepository userRepository, ISuperAdminGuard superAdminGuard, ILogger<UserManagementService> logger)
    {
        _userRepository = userRepository;
        _superAdminGuard = superAdminGuard;
        _logger = logger;
    }

    public async Task<IReadOnlyList<UserProfileResponse>> ListUsersAsync(CancellationToken cancellationToken = default)
    {
        await _userRepository.EnsureSuperAdminExistsAsync(cancellationToken);
        var users = await _userRepository.GetAllAsync(cancellationToken);
        return users.Select(u => u.ToProfileResponse()).ToList();
    }

    public async Task<UserProfileResponse> SetActiveStatusAsync(Guid userId, bool isActive, CancellationToken cancellationToken = default)
    {
        if (!isActive)
        {
            await EnsureNotLastSuperAdminAsync(userId, "deactivate", cancellationToken);
        }

        var user = await _userRepository.SetActiveStatusAsync(userId, isActive, cancellationToken)
            ?? throw new UserNotFoundException(userId);

        _logger.LogInformation("Account {Email} set to IsActive={IsActive}", user.Email, user.IsActive);

        return user.ToProfileResponse();
    }

    public async Task<UserProfileResponse> UpdateUserAsync(Guid userId, UpdateUserRequest request, CancellationToken cancellationToken = default)
    {
        if (!AuthConstants.AllRoles.Contains(request.Role))
        {
            throw new InvalidRoleException(request.Role, AuthConstants.AllRoles);
        }

        if (request.Role != "Admin")
        {
            await EnsureNotLastSuperAdminAsync(userId, "move to another role", cancellationToken);
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var user = await _userRepository.UpdateAsync(
            userId,
            request.FirstName.Trim(),
            request.LastName.Trim(),
            normalizedEmail,
            request.Role,
            DepartmentRules.ForRole(request.Role, request.Department),
            cancellationToken) ?? throw new UserNotFoundException(userId);

        _logger.LogInformation("Account {UserId} updated: Email={Email}, Role={Role}", user.UserId, user.Email, user.RoleName);

        return user.ToProfileResponse();
    }

    public async Task<UserProfileResponse> SetSuperAdminAsync(
        Guid callerUserId, Guid userId, bool isSuperAdmin, CancellationToken cancellationToken = default)
    {
        await _superAdminGuard.EnsureAsync(callerUserId, "give or remove full Admin controls", cancellationToken);

        var target = await _userRepository.GetByIdAsync(userId, cancellationToken) ?? throw new UserNotFoundException(userId);
        if (isSuperAdmin && (target.RoleName != "Admin" || !target.IsActive))
        {
            throw new InvalidSuperAdminChangeException("Only an active Admin-Registrar account can be given full controls.");
        }

        if (!isSuperAdmin)
        {
            await EnsureNotLastSuperAdminAsync(userId, "revoke", cancellationToken);
        }

        var updated = await _userRepository.SetSuperAdminAsync(userId, isSuperAdmin, cancellationToken)
            ?? throw new UserNotFoundException(userId);

        _logger.LogInformation("Account {Email} set to IsSuperAdmin={IsSuperAdmin}", updated.Email, updated.IsSuperAdmin);
        return updated.ToProfileResponse();
    }

    public async Task<UserProfileResponse> DeleteUserAsync(Guid callerUserId, Guid userId, CancellationToken cancellationToken = default)
    {
        await _superAdminGuard.EnsureAsync(callerUserId, "delete accounts", cancellationToken);

        if (callerUserId == userId)
        {
            throw new InvalidAccountDeletionException("You can't delete your own account.");
        }

        var target = await _userRepository.GetByIdAsync(userId, cancellationToken) ?? throw new UserNotFoundException(userId);

        try
        {
            await EnsureNotLastSuperAdminAsync(userId, "delete", cancellationToken);
        }
        catch (InvalidSuperAdminChangeException ex)
        {
            throw new InvalidAccountDeletionException(ex.Message);
        }

        var outcome = await _userRepository.DeleteAccountAsync(userId, cancellationToken);
        if (outcome == AccountDeleteOutcome.NotFound) throw new UserNotFoundException(userId);
        if (outcome == AccountDeleteOutcome.HasRecordedActivity)
        {
            throw new InvalidAccountDeletionException(
                "This account has recorded decisions, screenings, reservations or replies on other people's applications, so it can't be deleted. Deactivate it instead.");
        }

        _logger.LogInformation("Account {Email} deleted by {CallerUserId}", target.Email, callerUserId);
        return target.ToProfileResponse();
    }

    /// <summary>
    /// A Super Admin is the only one who can override the semester lock or
    /// grant Super Admin, so the last active one can't be removed from that
    /// position by any route - revoke, deactivate or role change.
    /// </summary>
    private async Task EnsureNotLastSuperAdminAsync(Guid userId, string action, CancellationToken cancellationToken)
    {
        var target = await _userRepository.GetByIdAsync(userId, cancellationToken);
        if (target is not { IsSuperAdmin: true, IsActive: true, RoleName: "Admin" }) return;

        if (await _userRepository.CountActiveSuperAdminsAsync(cancellationToken) <= 1)
        {
            throw new InvalidSuperAdminChangeException(
                $"You can't {action} the only Admin with full controls. Give another Admin full controls first.");
        }
    }

    private static string? NullIfEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
