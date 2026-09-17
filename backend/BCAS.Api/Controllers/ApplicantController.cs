using BCAS.Api.Exceptions;
using BCAS.Api.Extensions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

[Authorize(Roles = "Applicant")]
[ApiController]
[Route("api/applicant")]
public class ApplicantController : ControllerBase
{
    private readonly IApplicantProfileService _profileService;
    private readonly IAuthService _authService;

    public ApplicantController(IApplicantProfileService profileService, IAuthService authService)
    {
        _profileService = profileService;
        _authService = authService;
    }

    /// <summary>
    /// Returns the signed-in applicant's own profile. 404 means profile
    /// setup hasn't been completed yet - it's never partial, since every
    /// field is required to save.
    /// </summary>
    [HttpGet("profile")]
    [ProducesResponseType(typeof(ApplicantProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApplicantProfileResponse>> GetProfile(CancellationToken cancellationToken)
    {
        var profile = await _profileService.GetMyProfileAsync(User.GetUserId(), cancellationToken);
        return profile is null ? NotFound() : Ok(profile);
    }

    /// <summary>
    /// Creates or updates the signed-in applicant's own profile. Always
    /// scoped to the caller's own id from the auth cookie - there is no way
    /// for one applicant to write another's profile.
    /// </summary>
    [HttpPut("profile")]
    [ProducesResponseType(typeof(ApplicantProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApplicantProfileResponse>> SaveProfile(
        [FromBody] UpsertApplicantProfileRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var profile = await _profileService.SaveMyProfileAsync(User.GetUserId(), request, cancellationToken);
            return Ok(profile);
        }
        catch (InvalidBirthDateException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid birth date",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
    }

    /// <summary>
    /// Changes the signed-in applicant's own password. Requires the current
    /// password; the new one is re-hashed with BCrypt before being stored.
    /// Does not affect the caller's current session - the existing JWT
    /// remains valid until it naturally expires (same tradeoff as logout,
    /// see BISAASS-10).
    /// </summary>
    [HttpPut("password")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ChangePassword(
        [FromBody] ChangePasswordRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            await _authService.ChangePasswordAsync(User.GetUserId(), request, cancellationToken);
            return NoContent();
        }
        catch (IncorrectCurrentPasswordException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Incorrect current password",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
    }
}
