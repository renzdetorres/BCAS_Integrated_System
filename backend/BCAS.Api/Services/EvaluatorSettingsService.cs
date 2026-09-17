using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class EvaluatorSettingsService : IEvaluatorSettingsService
{
    private readonly IUserRepository _userRepository;
    private readonly IAuthService _authService;
    private readonly ILogger<EvaluatorSettingsService> _logger;

    public EvaluatorSettingsService(IUserRepository userRepository, IAuthService authService, ILogger<EvaluatorSettingsService> logger)
    {
        _userRepository = userRepository;
        _authService = authService;
        _logger = logger;
    }

    public async Task<UserProfileResponse> GetMyProfileAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new UserNotFoundException(userId);

        return user.ToProfileResponse();
    }

    public async Task<UserProfileResponse> UpdateMyProfileAsync(
        Guid userId,
        UpdateMyProfileRequest request,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var user = await _userRepository.UpdateProfileAsync(
            userId,
            request.FirstName.Trim(),
            request.LastName.Trim(),
            normalizedEmail,
            cancellationToken) ?? throw new UserNotFoundException(userId);

        _logger.LogInformation("Account {UserId} updated its own profile: Email={Email}", userId, user.Email);

        return user.ToProfileResponse();
    }

    public Task ChangeMyPasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken cancellationToken = default) =>
        _authService.ChangePasswordAsync(userId, request, cancellationToken);
}
