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

    /// <summary>
    /// Always completes successfully regardless of whether the email matches
    /// an account - only sends a reset email when it does (no-enumeration,
    /// same as LoginAsync). frontendBaseUrl is where the reset link should
    /// point (the controller resolves it - FrontendOptions.BaseUrl, or the
    /// request's own origin when that's unset).
    /// </summary>
    Task ForgotPasswordAsync(string email, string frontendBaseUrl, CancellationToken cancellationToken = default);

    /// <summary>
    /// Throws InvalidOrExpiredResetTokenException if the token doesn't match
    /// an unused, unexpired one.
    /// </summary>
    Task ResetPasswordAsync(string token, string newPassword, CancellationToken cancellationToken = default);
}
