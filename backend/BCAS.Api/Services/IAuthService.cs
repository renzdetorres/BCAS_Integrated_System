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
    /// IncorrectCurrentPasswordException if CurrentPassword doesn't match, or
    /// NewPasswordSameAsCurrentException if the new password is the current one, or
    /// TooManyPasswordAttemptsException after too many wrong current passwords in a row.
    /// On success every login issued under the old password stops working, an email tells the owner, and the
    /// result carries a fresh login for the caller's own device.
    /// </summary>
    Task<LoginResult> ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Call before saving a changed email address on a staff member's own profile. Returns null when the email is
    /// not actually changing; otherwise checks the current password (with the same wrong-attempt limit as
    /// ChangePasswordAsync) and returns the old address so the caller can pass it to NotifyEmailChanged.
    /// Throws IncorrectCurrentPasswordException or TooManyPasswordAttemptsException.
    /// </summary>
    Task<string?> AuthorizeEmailChangeAsync(Guid userId, string newEmail, string? currentPassword, CancellationToken cancellationToken = default);

    /// <summary>
    /// Tells the OLD address that the account's email was changed (to the new one), so a change the owner
    /// didn't make is noticed. Sent in the background; never throws.
    /// </summary>
    void NotifyEmailChanged(string oldEmail, string firstName, string newEmail);

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
    /// an unused, unexpired one, or NewPasswordSameAsCurrentException if the
    /// new password is the account's current one (the token stays unused). On success every existing login
    /// for the account stops working and an email tells the owner.
    /// </summary>
    Task ResetPasswordAsync(string token, string newPassword, CancellationToken cancellationToken = default);
}
