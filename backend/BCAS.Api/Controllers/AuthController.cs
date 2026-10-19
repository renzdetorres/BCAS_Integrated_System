using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using BCAS.Api.Constants;
using BCAS.Api.Exceptions;
using BCAS.Api.Extensions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
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
    private readonly ISuperAdminGuard _superAdminGuard;
    private readonly IMemoryCache _cache;
    private readonly ILogger<AuthController> _logger;

    // Throttling. Sign-in failures are counted per (address + email), per email and per address, so one
    // person typing a wrong password is not locked out by someone else, and a guesser can't just rotate emails.
    private static readonly TimeSpan LoginWindow = TimeSpan.FromMinutes(10);
    private const int LoginFailuresPerPairLimit = 5;
    private const int LoginFailuresPerEmailLimit = 30;
    private const int LoginFailuresPerIpLimit = 40;

    // Past the per-email failure limit an account is not locked: its sign-in attempts are spaced this far apart
    // instead, and a correct password still gets in. A guesser's budget stays the same (30 failures per window plus
    // one try per spacing), but a stranger can no longer lock the real owner out for the whole window.
    private static readonly TimeSpan EmailPacing = TimeSpan.FromSeconds(20);

    public AuthController(
        IAuthService authService,
        IOptions<AuthCookieOptions> cookieOptions,
        IOptions<FrontendOptions> frontendOptions,
        IAuditLogService auditLogService,
        AttemptLimiter limiter,
        IHostEnvironment environment,
        ISuperAdminGuard superAdminGuard,
        IMemoryCache cache,
        ILogger<AuthController> logger)
    {
        _authService = authService;
        _cookieOptions = cookieOptions.Value;
        _frontendOptions = frontendOptions.Value;
        _auditLogService = auditLogService;
        _limiter = limiter;
        _environment = environment;
        _superAdminGuard = superAdminGuard;
        _cache = cache;
        _logger = logger;
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
    /// Null outside local development when no address is configured: the Host header is attacker-controlled, so a
    /// reset link must never be built from it on the live site.
    /// </summary>
    private string? FrontendBaseUrl =>
        !string.IsNullOrWhiteSpace(_frontendOptions.BaseUrl)
            ? _frontendOptions.BaseUrl!
            : _environment.IsDevelopment() ? $"{Request.Scheme}://{Request.Host}" : null;

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
    [AllowAnonymous]
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
    [AllowAnonymous]
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

        // Over the failure limit for this address (alone, or with this email): refuse before even checking the
        // password. These only ever affect the person making the attempts, so they can't be used to lock out someone else.
        var locked = new[]
        {
            (Key: pairKey, Limit: LoginFailuresPerPairLimit),
            (Key: ipKey, Limit: LoginFailuresPerIpLimit),
        }.Where(k => _limiter.Count(k.Key, LoginWindow) >= k.Limit).ToList();
        if (locked.Count > 0)
        {
            return TooManyAttempts(locked.Max(k => _limiter.SecondsUntilFree(k.Key, LoginWindow)));
        }

        // Too many failures on this email from everywhere (a guesser rotating addresses): space the attempts out
        // rather than refusing the account for the whole window. This applies the same way to an email that has no
        // account, so it can't be used to tell which emails exist.
        var emailPaceKey = $"login:email-pace:{email}";
        if (_limiter.Count(emailKey, LoginWindow) >= LoginFailuresPerEmailLimit && !_limiter.TryRecord(emailPaceKey, 1, EmailPacing))
        {
            return TooManyAttempts(_limiter.SecondsUntilFree(emailPaceKey, EmailPacing));
        }

        try
        {
            var result = await _authService.LoginAsync(request, cancellationToken);
            _limiter.Clear(pairKey);
            // Knowing the password proves this is the owner, so earlier failures from others stop counting against them.
            _limiter.Clear(emailKey);
            _limiter.Clear(emailPaceKey);

            this.SetAuthCookie(result.Token, result.ExpiresAtUtc);

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
    [AllowAnonymous]
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

        var baseUrl = FrontendBaseUrl;
        if (baseUrl is null)
        {
            // Same answer as any other request, so this can't be used to probe accounts; the log says what to fix.
            _logger.LogError("A password reset was requested but Frontend__BaseUrl is not set, so no reset email was sent (a link built from the request's Host header could be forged). Set Frontend__BaseUrl to this site's address.");
            return NoContent();
        }

        await _authService.ForgotPasswordAsync(request.Email, baseUrl, cancellationToken);
        return NoContent();
    }

    /// <summary>Sets a new password from a valid reset-email link/token.</summary>
    [AllowAnonymous]
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
        catch (NewPasswordSameAsCurrentException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Choose a different password",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
    }

    /// <summary>
    /// Signs the session out: the login's token id is marked as revoked until the moment it would have expired
    /// (so a copy of the cookie stops working too) and the cookie is cleared. The mark lives in memory, so an
    /// app restart forgets it; the token's own 60-minute lifetime is the backstop.
    /// Idempotent - safe to call even when no cookie is present.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout()
    {
        var current = await HttpContext.AuthenticateAsync(JwtBearerDefaults.AuthenticationScheme);
        if (current.Succeeded)
        {
            var tokenId = current.Principal.FindFirstValue(JwtRegisteredClaimNames.Jti);
            if (tokenId is not null && long.TryParse(current.Principal.FindFirstValue(JwtRegisteredClaimNames.Exp), out var expiresAtUnix))
            {
                _cache.Set(AuthConstants.RevokedTokenKey(tokenId), true, DateTimeOffset.FromUnixTimeSeconds(expiresAtUnix));
            }
        }

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
    public async Task<IActionResult> Me(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        return Ok(new UserProfileResponse
        {
            UserId = userId,
            Email = User.FindFirstValue(JwtRegisteredClaimNames.Email) ?? string.Empty,
            FirstName = User.FindFirstValue(ClaimTypes.GivenName) ?? string.Empty,
            LastName = User.FindFirstValue(ClaimTypes.Surname) ?? string.Empty,
            Role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty,
            // Always true here: login already rejects inactive accounts, so a
            // valid JWT could only have been issued to an active one. This
            // reflects status as of login, not a deactivation that happened
            // since - the JWT itself isn't re-checked against the database.
            IsActive = true,
            // Not in the JWT, so read fresh: without it a page reload would hide
            // every Super Admin-only page until the next sign-in.
            IsSuperAdmin = await _superAdminGuard.IsSuperAdminAsync(userId, cancellationToken),
        });
    }
}
