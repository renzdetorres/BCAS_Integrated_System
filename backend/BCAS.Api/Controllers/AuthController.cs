using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using BCAS.Api.Constants;
using BCAS.Api.Exceptions;
using BCAS.Api.Extensions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace BCAS.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly AuthCookieOptions _cookieOptions;
    private readonly FrontendOptions _frontendOptions;
    private readonly IAuditLogService _auditLogService;
    private readonly AttemptLimiter _limiter;
    private readonly IHostEnvironment _environment;

    // Throttling. Sign-in failures are counted per (address + email), per email and per address, so one
    // person typing a wrong password is not locked out by someone else, and a guesser can't just rotate emails.
    private static readonly TimeSpan LoginWindow = TimeSpan.FromMinutes(10);
    private const int LoginFailuresPerPairLimit = 5;
    private const int LoginFailuresPerEmailLimit = 30;
    private const int LoginFailuresPerIpLimit = 40;

    public AuthController(
        IAuthService authService,
        IOptions<AuthCookieOptions> cookieOptions,
        IOptions<FrontendOptions> frontendOptions,
        IAuditLogService auditLogService,
        AttemptLimiter limiter,
        IHostEnvironment environment)
    {
        _authService = authService;
        _cookieOptions = cookieOptions.Value;
        _frontendOptions = frontendOptions.Value;
        _auditLogService = auditLogService;
        _limiter = limiter;
        _environment = environment;
    }

    private string ClientIp => HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    /// <summary>429 with a Retry-After header and a message that says how long to wait.</summary>
    private ObjectResult TooManyAttempts(int retryAfterSeconds)
    {
        var seconds = Math.Max(1, retryAfterSeconds);
        Response.Headers.RetryAfter = seconds.ToString();
        var minutes = (int)Math.Ceiling(seconds / 60.0);
        return StatusCode(StatusCodes.Status429TooManyRequests, new ProblemDetails
        {
            Title = "Too many attempts",
            Detail = $"Too many attempts. Please wait {minutes} minute{(minutes == 1 ? "" : "s")} and try again.",
            Status = StatusCodes.Status429TooManyRequests,
        });
    }

    /// <summary>
    /// Where the reset-password link should point: the configured frontend
    /// origin if set (needed in local dev, where Vite and the API are
    /// different origins), else this same request's own origin (correct in
    /// production, where the API serves the SPA itself - see FrontendOptions).
    /// </summary>
    private string FrontendBaseUrl =>
        !string.IsNullOrWhiteSpace(_frontendOptions.BaseUrl)
            ? _frontendOptions.BaseUrl!
            : $"{Request.Scheme}://{Request.Host}";

    /// <summary>
    /// The two cookie attributes that must match between Login (Append) and
    /// Logout (Delete) for the browser to treat them as the same cookie - see
    /// AuthCookieOptions.RequireHttps for why this is configurable rather
    /// than hardcoded.
    /// </summary>
    private (bool Secure, SameSiteMode SameSite) CookieSecurity =>
        _cookieOptions.Resolve(Request.IsHttps, _environment.IsDevelopment());

    /// <summary>
    /// Public self-service registration. Always creates an Applicant account;
    /// staff roles must be provisioned separately by an Admin.
    /// </summary>
    [HttpPost("register")]
    [ProducesResponseType(typeof(UserProfileResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UserProfileResponse>> Register(
        [FromBody] RegisterRequest request,
        CancellationToken cancellationToken)
    {
        if (!_limiter.TryRecord($"register:ip:{ClientIp}", 10, TimeSpan.FromHours(1)))
        {
            return TooManyAttempts(_limiter.SecondsUntilFree($"register:ip:{ClientIp}", TimeSpan.FromHours(1)));
        }

        try
        {
            var response = await _authService.RegisterApplicantAsync(request, cancellationToken);
            return CreatedAtAction(nameof(Register), new { id = response.UserId }, response);
        }
        catch (DuplicateEmailException ex)
        {
            return Conflict(new ProblemDetails
            {
                Title = "Email already registered",
                Detail = ex.Message,
                Status = StatusCodes.Status409Conflict,
            });
        }
    }

    /// <summary>
    /// Verifies credentials and, on success, issues a JWT in an HttpOnly,
    /// Secure, SameSite cookie. Failures (unknown email, wrong password,
    /// inactive account) all return the same generic error.
    /// </summary>
    [HttpPost("login")]
    [ProducesResponseType(typeof(UserProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<UserProfileResponse>> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var pairKey = $"login:{ClientIp}:{email}";
        var emailKey = $"login:email:{email}";
        var ipKey = $"login:ip:{ClientIp}";

        // Over the failure limit: refuse before even checking the password. This applies the same way to
        // an email that has no account, so it can't be used to tell which emails exist.
        var locked = new[]
        {
            (Key: pairKey, Limit: LoginFailuresPerPairLimit),
            (Key: emailKey, Limit: LoginFailuresPerEmailLimit),
            (Key: ipKey, Limit: LoginFailuresPerIpLimit),
        }.Where(k => _limiter.Count(k.Key, LoginWindow) >= k.Limit).ToList();
        if (locked.Count > 0)
        {
            return TooManyAttempts(locked.Max(k => _limiter.SecondsUntilFree(k.Key, LoginWindow)));
        }

        try
        {
            var result = await _authService.LoginAsync(request, cancellationToken);
            _limiter.Clear(pairKey);

            var (secure, sameSite) = CookieSecurity;
            Response.Cookies.Append(AuthConstants.AuthCookieName, result.Token, new CookieOptions
            {
                HttpOnly = true,
                Secure = secure,
                SameSite = sameSite,
                Path = "/",
                Expires = result.ExpiresAtUtc,
            });

            // Staff accountability log, not applicant usage telemetry - an
            // Applicant logging in isn't an administrative action, and at
            // real volume it would bury the staff activity this log exists
            // to surface. See AuditLogService's summary comment.
            if (result.User.Role != "Applicant")
            {
                await _auditLogService.LogAsync(result.User.UserId, result.User.Email, "Login", cancellationToken: cancellationToken);
            }

            return Ok(result.User);
        }
        catch (InvalidCredentialsException ex)
        {
            _limiter.Record(pairKey, LoginWindow);
            _limiter.Record(emailKey, LoginWindow);
            _limiter.Record(ipKey, LoginWindow);
            return Unauthorized(new ProblemDetails
            {
                Title = "Login failed",
                Detail = ex.Message,
                Status = StatusCodes.Status401Unauthorized,
            });
        }
    }

    /// <summary>
    /// Always returns 204 regardless of whether the email matches an
    /// account - an email is only actually sent when it does (no-enumeration,
    /// same reasoning as Login's generic failure message).
    /// </summary>
    [HttpPost("forgot-password")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        var ipKey = $"forgot:ip:{ClientIp}";
        if (!_limiter.TryRecord(ipKey, 5, TimeSpan.FromMinutes(15)))
        {
            return TooManyAttempts(_limiter.SecondsUntilFree(ipKey, TimeSpan.FromMinutes(15)));
        }

        // At most three reset emails per address per hour. Past that the answer is still 204 and nothing is
        // sent, so the endpoint can't be used to flood someone's inbox and still reveals nothing about accounts.
        var emailKey = $"forgot:email:{request.Email.Trim().ToLowerInvariant()}";
        if (!_limiter.TryRecord(emailKey, 3, TimeSpan.FromHours(1)))
        {
            return NoContent();
        }

        await _authService.ForgotPasswordAsync(request.Email, FrontendBaseUrl, cancellationToken);
        return NoContent();
    }

    /// <summary>Sets a new password from a valid reset-email link/token.</summary>
    [HttpPost("reset-password")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        var ipKey = $"reset:ip:{ClientIp}";
        if (!_limiter.TryRecord(ipKey, 10, TimeSpan.FromMinutes(15)))
        {
            return TooManyAttempts(_limiter.SecondsUntilFree(ipKey, TimeSpan.FromMinutes(15)));
        }

        try
        {
            await _authService.ResetPasswordAsync(request.Token, request.NewPassword, cancellationToken);
            return NoContent();
        }
        catch (InvalidOrExpiredResetTokenException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Reset link invalid",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
    }

    /// <summary>
    /// Clears the auth cookie server-side, invalidating the client's session.
    /// Idempotent - safe to call even when no cookie is present.
    /// </summary>
    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public IActionResult Logout()
    {
        var (secure, sameSite) = CookieSecurity;
        Response.Cookies.Delete(AuthConstants.AuthCookieName, new CookieOptions
        {
            HttpOnly = true,
            Secure = secure,
            SameSite = sameSite,
            Path = "/",
        });

        return NoContent();
    }

    /// <summary>
    /// Returns the identity of the currently authenticated user. Requires a
    /// valid auth cookie - used to confirm that requests made without one
    /// (e.g. after logout) are treated as unauthenticated.
    /// </summary>
    [Authorize]
    [HttpGet("me")]
    [ProducesResponseType(typeof(UserProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public IActionResult Me()
    {
        return Ok(new UserProfileResponse
        {
            UserId = User.GetUserId(),
            Email = User.FindFirstValue(JwtRegisteredClaimNames.Email) ?? string.Empty,
            FirstName = User.FindFirstValue(ClaimTypes.GivenName) ?? string.Empty,
            LastName = User.FindFirstValue(ClaimTypes.Surname) ?? string.Empty,
            Role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty,
            // Always true here: login already rejects inactive accounts, so a
            // valid JWT could only have been issued to an active one. This
            // reflects status as of login, not a deactivation that happened
            // since - the JWT itself isn't re-checked against the database.
            IsActive = true,
        });
    }
}
