using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using BCAS.Api.Constants;
using BCAS.Api.Exceptions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

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
        try
        {
            var result = await _authService.LoginAsync(request, cancellationToken);

            Response.Cookies.Append(AuthConstants.AuthCookieName, result.Token, new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Lax,
                Path = "/",
                Expires = result.ExpiresAtUtc,
            });

            return Ok(result.User);
        }
        catch (InvalidCredentialsException ex)
        {
            return Unauthorized(new ProblemDetails
            {
                Title = "Login failed",
                Detail = ex.Message,
                Status = StatusCodes.Status401Unauthorized,
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
        Response.Cookies.Delete(AuthConstants.AuthCookieName, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Lax,
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
        var userId = User.FindFirstValue(JwtRegisteredClaimNames.Sub);

        return Ok(new UserProfileResponse
        {
            UserId = Guid.Parse(userId!),
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
