using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class UserManagementService : IUserManagementService
{
    private readonly IUserRepository _userRepository;
    private readonly ILogger<UserManagementService> _logger;

    public UserManagementService(IUserRepository userRepository, ILogger<UserManagementService> logger)
    {
        _userRepository = userRepository;
        _logger = logger;
    }

    public async Task<IReadOnlyList<UserProfileResponse>> ListUsersAsync(CancellationToken cancellationToken = default)
    {
        var users = await _userRepository.GetAllAsync(cancellationToken);
        return users.Select(u => u.ToProfileResponse()).ToList();
    }

    public async Task<UserProfileResponse> SetActiveStatusAsync(Guid userId, bool isActive, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.SetActiveStatusAsync(userId, isActive, cancellationToken)
            ?? throw new UserNotFoundException(userId);

        _logger.LogInformation("Account {Email} set to IsActive={IsActive}", user.Email, user.IsActive);

        return user.ToProfileResponse();
    }
}
