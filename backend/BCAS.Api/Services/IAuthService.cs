using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IAuthService
{
    Task<UserProfileResponse> RegisterApplicantAsync(RegisterRequest request, CancellationToken cancellationToken = default);

    Task<LoginResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Verifies the caller's current password and, on success, re-hashes and
    /// stores the new one. Throws UserNotFoundException if the id doesn't
    /// match an account (shouldn't happen for a valid session), or
    /// IncorrectCurrentPasswordException if CurrentPassword doesn't match.
    /// </summary>
    Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken cancellationToken = default);
}
