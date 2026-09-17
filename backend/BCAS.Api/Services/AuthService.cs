using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class AuthService : IAuthService
{
    // A valid bcrypt hash with no corresponding real password, verified against
    // when the email lookup misses so a missing account takes the same time as
    // a wrong password and can't be distinguished by response latency.
    private const string DummyHashForTimingParity =
        "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

    private readonly IUserRepository _userRepository;
    private readonly ITokenService _tokenService;
    private readonly ILogger<AuthService> _logger;

    public AuthService(IUserRepository userRepository, ITokenService tokenService, ILogger<AuthService> logger)
    {
        _userRepository = userRepository;
        _tokenService = tokenService;
        _logger = logger;
    }

    public async Task<RegisterResponse> RegisterApplicantAsync(RegisterRequest request, CancellationToken cancellationToken = default)
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

        return new RegisterResponse
        {
            UserId = user.UserId,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            Role = user.RoleName,
        };
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
            User = new LoginResponse
            {
                UserId = user.UserId,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email,
                Role = user.RoleName,
            },
            Token = token,
            ExpiresAtUtc = expiresAtUtc,
        };
    }
}
