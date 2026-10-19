using System.Security.Cryptography;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Constants;
using BCAS.Api.Mapping;
using BCAS.Api.Models;
using Microsoft.Extensions.Caching.Memory;

namespace BCAS.Api.Services;

public class AuthService : IAuthService
{
    // A bcrypt hash of a password nobody knows, checked when the email lookup misses (or the account is
    // inactive) so those paths cost the same as a wrong password and can't be told apart by response time.
    // It is made with the same work factor as real passwords; a cheaper dummy would answer faster.
    private const int PasswordWorkFactor = 12;
    private static readonly string DummyHashForTimingParity =
        BCrypt.Net.BCrypt.HashPassword(Convert.ToHexString(RandomNumberGenerator.GetBytes(16)), workFactor: PasswordWorkFactor);

    private static readonly TimeSpan ResetTokenLifetime = TimeSpan.FromMinutes(30);

    // Wrong current passwords on the change-password form: after this many inside the window, the form is
    // locked for the rest of it (counted per account, so a hijacked session can't be used to guess the password).
    private const int WrongCurrentPasswordLimit = 5;
    private static readonly TimeSpan WrongCurrentPasswordWindow = TimeSpan.FromMinutes(15);

    private readonly IUserRepository _userRepository;
    private readonly ITokenService _tokenService;
    private readonly IPasswordResetTokenRepository _resetTokenRepository;
    private readonly IEmailSender _emailSender;
    private readonly IHostEnvironment _environment;
    private readonly IMemoryCache _cache;
    private readonly AttemptLimiter _limiter;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IUserRepository userRepository,
        ITokenService tokenService,
        IPasswordResetTokenRepository resetTokenRepository,
        IEmailSender emailSender,
        IHostEnvironment environment,
        IMemoryCache cache,
        AttemptLimiter limiter,
        ILogger<AuthService> logger)
    {
        _userRepository = userRepository;
        _tokenService = tokenService;
        _resetTokenRepository = resetTokenRepository;
        _emailSender = emailSender;
        _environment = environment;
        _cache = cache;
        _limiter = limiter;
        _logger = logger;
    }

    public async Task<UserProfileResponse> RegisterApplicantAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        if (await _userRepository.EmailExistsAsync(normalizedEmail, cancellationToken))
        {
            throw new DuplicateEmailException(normalizedEmail);
        }

        // Role is always Applicant for self-service registration; staff roles
        // are never accepted from this endpoint regardless of client input.
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, workFactor: PasswordWorkFactor);

        var user = await _userRepository.CreateApplicantAsync(
            request.FirstName.Trim(),
            request.LastName.Trim(),
            normalizedEmail,
            passwordHash,
            cancellationToken);

        _logger.LogInformation("Applicant account created for {Email}", user.Email);

        return user.ToProfileResponse();
    }

    public async Task<LoginResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await _userRepository.GetByEmailAsync(normalizedEmail, cancellationToken);

        if (user is null)
        {
            // Run a verify against a dummy hash so this path costs the same as
            // a genuine wrong-password check below - no email-enumeration by timing.
            BCrypt.Net.BCrypt.Verify(request.Password, DummyHashForTimingParity);
            throw new InvalidCredentialsException();
        }

        // Always do the password check, even for an inactive account, so the time taken doesn't give it away.
        var passwordMatches = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
        if (!user.IsActive || !passwordMatches)
        {
            throw new InvalidCredentialsException();
        }

        var (token, expiresAtUtc) = _tokenService.GenerateToken(user);

        _logger.LogInformation("User {Email} logged in", user.Email);

        return new LoginResult
        {
            User = user.ToProfileResponse(),
            Token = token,
            ExpiresAtUtc = expiresAtUtc,
        };
    }

    public async Task<LoginResult> ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new UserNotFoundException(userId);

        VerifyCurrentPassword(user, request.CurrentPassword);

        if (BCrypt.Net.BCrypt.Verify(request.NewPassword, user.PasswordHash))
        {
            throw new NewPasswordSameAsCurrentException();
        }

        var newPasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword, workFactor: PasswordWorkFactor);
        await _userRepository.UpdatePasswordHashAsync(userId, newPasswordHash, cancellationToken);

        _logger.LogInformation("Password changed for {UserId}", userId);

        // Every login issued under the old password stops working. The caller gets a fresh one so the person
        // who just changed it stays signed in on this device.
        user.PasswordHash = newPasswordHash;
        _cache.Remove(AuthConstants.SessionCacheKey(userId));
        SendPasswordChangedEmailInBackground(user);

        var (token, expiresAtUtc) = _tokenService.GenerateToken(user);
        return new LoginResult { User = user.ToProfileResponse(), Token = token, ExpiresAtUtc = expiresAtUtc };
    }

    public async Task<string?> AuthorizeEmailChangeAsync(Guid userId, string newEmail, string? currentPassword, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new UserNotFoundException(userId);

        if (string.Equals(user.Email, newEmail.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        // Without this, a stolen session could point the account's email at the thief and then reset the password.
        VerifyCurrentPassword(user, currentPassword, "Enter your current password to change your email.");
        return user.Email;
    }

    public void NotifyEmailChanged(string oldEmail, string firstName, string newEmail)
    {
        var changedAtUtc = DateTime.UtcNow;
        SendSecurityNoticeInBackground(
            oldEmail,
            "The email on your BCAS account was changed",
            $"Hi {firstName},\n\n" +
            $"The email address on your BCAS account was changed from {oldEmail} to {newEmail} on {changedAtUtc:MMMM d, yyyy} at {changedAtUtc:HH:mm} UTC.\n\n" +
            "If this was you, there is nothing more to do.\n\n" +
            "If it wasn't you, contact the admissions office right away so they can secure your account. " +
            "Password reset links now go to the new address.");
    }

    public async Task ForgotPasswordAsync(string email, string frontendBaseUrl, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await _userRepository.GetByEmailAsync(normalizedEmail, cancellationToken);

        // No-enumeration: silently do nothing for an unknown or inactive
        // account rather than throwing - the controller returns the same
        // response either way.
        if (user is null || !user.IsActive)
        {
            return;
        }

        var rawToken = GenerateRawToken();
        var tokenHash = HashToken(rawToken);
        var expiresAtUtc = DateTime.UtcNow.Add(ResetTokenLifetime);

        await _resetTokenRepository.InsertAsync(user.UserId, tokenHash, expiresAtUtc, cancellationToken);

        var resetLink = $"{frontendBaseUrl.TrimEnd('/')}/reset-password?token={Uri.EscapeDataString(rawToken)}";

        if (_environment.IsDevelopment())
        {
            // Local dev has no real SMTP server configured - this is the only
            // way to actually get the link during testing. Never logged
            // outside Development: a token in a log file is as sensitive as
            // one in transit.
            _logger.LogInformation("[DEV ONLY] Password reset link for {Email}: {Link}", user.Email, resetLink);
        }

        // Sent in the background. If the request waited for the mail server, an address with an account would
        // answer seconds slower than one without, which tells an attacker which emails are registered.
        var toAddress = user.Email;
        var firstName = user.FirstName;
        var userId = user.UserId;
        var lifetimeMinutes = ResetTokenLifetime.TotalMinutes;
        _ = Task.Run(async () =>
        {
            try
            {
                await _emailSender.SendAsync(
                    toAddress,
                    "Reset Your BCAS Password",
                    $"Hi {firstName},\n\n" +
                    "We received a request to reset your BCAS account password. Click the link below to choose a new one:\n\n" +
                    $"{resetLink}\n\n" +
                    $"This link expires in {lifetimeMinutes:0} minutes. " +
                    "If you didn't request this, you can safely ignore this email - your password won't be changed.");
            }
            catch (Exception ex)
            {
                // An email outage must never surface as a different response than "no such account" would.
                _logger.LogError(ex, "Failed to send password reset email to {UserId}", userId);
            }
        });
    }

    public async Task ResetPasswordAsync(string token, string newPassword, CancellationToken cancellationToken = default)
    {
        var tokenHash = HashToken(token);
        var userId = await _resetTokenRepository.GetValidUserIdAsync(tokenHash, cancellationToken)
            ?? throw new InvalidOrExpiredResetTokenException();

        // Refused before anything is saved and before the token is marked used, so the same link still works
        // for another try. An account that no longer exists reads as an invalid link, like any unknown token.
        var user = await _userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new InvalidOrExpiredResetTokenException();
        if (BCrypt.Net.BCrypt.Verify(newPassword, user.PasswordHash))
        {
            throw new NewPasswordSameAsCurrentException();
        }

        var newPasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword, workFactor: PasswordWorkFactor);
        await _userRepository.UpdatePasswordHashAsync(userId, newPasswordHash, cancellationToken);
        await _resetTokenRepository.MarkUsedAsync(tokenHash, cancellationToken);

        _logger.LogInformation("Password reset via token for {UserId}", userId);

        // A reset usually means someone else may have had access, so every existing login is signed out.
        _cache.Remove(AuthConstants.SessionCacheKey(userId));
        SendPasswordChangedEmailInBackground(user);
    }

    /// <summary>
    /// Checks the account's current password for a sensitive change, counting wrong tries per account: too many
    /// in a row lock these forms for the rest of the window (so a hijacked session can't be used to guess it).
    /// </summary>
    private void VerifyCurrentPassword(User user, string? currentPassword, string? missingMessage = null)
    {
        var attemptsKey = $"changepw:{user.UserId}";
        if (_limiter.Count(attemptsKey, WrongCurrentPasswordWindow) >= WrongCurrentPasswordLimit)
        {
            throw new TooManyPasswordAttemptsException(_limiter.SecondsUntilFree(attemptsKey, WrongCurrentPasswordWindow));
        }

        if (string.IsNullOrEmpty(currentPassword) && missingMessage is not null)
        {
            throw new IncorrectCurrentPasswordException(missingMessage);
        }

        if (!BCrypt.Net.BCrypt.Verify(currentPassword ?? string.Empty, user.PasswordHash))
        {
            _limiter.Record(attemptsKey, WrongCurrentPasswordWindow);
            throw new IncorrectCurrentPasswordException();
        }

        _limiter.Clear(attemptsKey);
    }

    private void SendPasswordChangedEmailInBackground(User user)
    {
        var changedAtUtc = DateTime.UtcNow;
        SendSecurityNoticeInBackground(
            user.Email,
            "Your BCAS password was changed",
            $"Hi {user.FirstName},\n\n" +
            $"The password on your BCAS account was changed on {changedAtUtc:MMMM d, yyyy} at {changedAtUtc:HH:mm} UTC, " +
            "and you were signed out of other devices.\n\n" +
            "If this was you, there is nothing more to do.\n\n" +
            "If it wasn't you, reset your password right away using \"Forgot password\" on the sign-in page, " +
            "and contact the admissions office so they can check your account.");
    }

    /// <summary>
    /// Sends a "this just happened to your account" notice in the background, so it never fails or slows the
    /// change it reports, like the reset email.
    /// </summary>
    private void SendSecurityNoticeInBackground(string toAddress, string subject, string body)
    {
        _ = Task.Run(async () =>
        {
            try
            {
                await _emailSender.SendAsync(toAddress, subject, body);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send the security notice \"{Subject}\"", subject);
            }
        });
    }

    private static string GenerateRawToken() =>
        Convert.ToHexString(RandomNumberGenerator.GetBytes(32));

    private static string HashToken(string rawToken) =>
        Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(rawToken)));
}
