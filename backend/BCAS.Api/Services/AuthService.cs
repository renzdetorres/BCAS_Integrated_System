using System.Security.Cryptography;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class AuthService : IAuthService
{
    // A valid bcrypt hash with no corresponding real password, verified against
    // when the email lookup misses so a missing account takes the same time as
    // a wrong password and can't be distinguished by response latency.
    private const string DummyHashForTimingParity =
        "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

    private static readonly TimeSpan ResetTokenLifetime = TimeSpan.FromMinutes(30);

    private readonly IUserRepository _userRepository;
    private readonly ITokenService _tokenService;
    private readonly IPasswordResetTokenRepository _resetTokenRepository;
    private readonly IEmailSender _emailSender;
    private readonly IDuplicateApplicantService _duplicateApplicantService;
    private readonly IHostEnvironment _environment;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IUserRepository userRepository,
        ITokenService tokenService,
        IPasswordResetTokenRepository resetTokenRepository,
        IEmailSender emailSender,
        IDuplicateApplicantService duplicateApplicantService,
        IHostEnvironment environment,
        ILogger<AuthService> logger)
    {
        _userRepository = userRepository;
        _tokenService = tokenService;
        _resetTokenRepository = resetTokenRepository;
        _emailSender = emailSender;
        _duplicateApplicantService = duplicateApplicantService;
        _environment = environment;
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
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, workFactor: 12);

        var user = await _userRepository.CreateApplicantAsync(
            request.FirstName.Trim(),
            request.LastName.Trim(),
            normalizedEmail,
            passwordHash,
            cancellationToken);

        _logger.LogInformation("Applicant account created for {Email}", user.Email);

        // Runs after the account already exists and never throws (see the
        // interface doc) - a duplicate-detection hiccup must not turn into
        // a failed registration.
        await _duplicateApplicantService.DetectAndFlagAsync(user.UserId, user.FirstName, user.LastName, cancellationToken);

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

        if (!user.IsActive || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
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

    public async Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new UserNotFoundException(userId);

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
        {
            throw new IncorrectCurrentPasswordException();
        }

        var newPasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword, workFactor: 12);
        await _userRepository.UpdatePasswordHashAsync(userId, newPasswordHash, cancellationToken);

        _logger.LogInformation("Password changed for {UserId}", userId);
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

        try
        {
            await _emailSender.SendAsync(
                user.Email,
                "Reset Your BCAS Password",
                $"Hi {user.FirstName},\n\n" +
                "We received a request to reset your BCAS account password. Click the link below to choose a new one:\n\n" +
                $"{resetLink}\n\n" +
                $"This link expires in {ResetTokenLifetime.TotalMinutes:0} minutes. " +
                "If you didn't request this, you can safely ignore this email - your password won't be changed.",
                cancellationToken);
        }
        catch (Exception ex)
        {
            // Same philosophy as NotificationDispatchService: an email
            // outage must never surface as a different response than "no
            // such account" would, or it becomes an enumeration channel.
            _logger.LogError(ex, "Failed to send password reset email to {UserId}", user.UserId);
        }
    }

    public async Task ResetPasswordAsync(string token, string newPassword, CancellationToken cancellationToken = default)
    {
        var tokenHash = HashToken(token);
        var userId = await _resetTokenRepository.GetValidUserIdAsync(tokenHash, cancellationToken)
            ?? throw new InvalidOrExpiredResetTokenException();

        var newPasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword, workFactor: 12);
        await _userRepository.UpdatePasswordHashAsync(userId, newPasswordHash, cancellationToken);
        await _resetTokenRepository.MarkUsedAsync(tokenHash, cancellationToken);

        _logger.LogInformation("Password reset via token for {UserId}", userId);
    }

    private static string GenerateRawToken() =>
        Convert.ToHexString(RandomNumberGenerator.GetBytes(32));

    private static string HashToken(string rawToken) =>
        Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(rawToken)));
}
