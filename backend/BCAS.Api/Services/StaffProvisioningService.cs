using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class StaffProvisioningService : IStaffProvisioningService
{
    private readonly IUserRepository _userRepository;
    private readonly ILogger<StaffProvisioningService> _logger;

    public StaffProvisioningService(IUserRepository userRepository, ILogger<StaffProvisioningService> logger)
    {
        _userRepository = userRepository;
        _logger = logger;
    }

    public async Task<UserProfileResponse> CreateStaffAsync(ProvisionStaffRequest request, CancellationToken cancellationToken = default)
    {
        if (!AuthConstants.AllowedStaffRoles.Contains(request.Role))
        {
            throw new InvalidRoleException(request.Role);
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        if (await _userRepository.EmailExistsAsync(normalizedEmail, cancellationToken))
        {
            throw new DuplicateEmailException(normalizedEmail);
        }

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, workFactor: 12);

        var user = await _userRepository.CreateStaffAsync(
            request.FirstName.Trim(),
            request.LastName.Trim(),
            normalizedEmail,
            passwordHash,
            request.Role,
            cancellationToken);

        _logger.LogInformation("Staff account created for {Email} with role {Role}", user.Email, user.RoleName);

        return user.ToProfileResponse();
    }
}
