using BCAS.Api.Exceptions;
using BCAS.Api.Extensions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>Support Staff-facing self-service settings (BISAASS-55): own profile details and password.</summary>
[Authorize(Roles = "SupportStaff")]
[ApiController]
[Route("api/support-staff/settings")]
public class SupportStaffSettingsController : ControllerBase
{
    private readonly ISupportStaffSettingsService _settingsService;

    public SupportStaffSettingsController(ISupportStaffSettingsService settingsService)
    {
        _settingsService = settingsService;
    }

    /// <summary>Returns the signed-in Support Staff's own account details.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(UserProfileResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<UserProfileResponse>> GetMyProfile(CancellationToken cancellationToken)
    {
        var profile = await _settingsService.GetMyProfileAsync(User.GetUserId(), cancellationToken);
        return Ok(profile);
    }

    /// <summary>
    /// Updates the signed-in Support Staff's own name and email. Role and
    /// active status are never editable here - only an Admin can change those.
    /// </summary>
    [HttpPut("profile")]
    [ProducesResponseType(typeof(UserProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UserProfileResponse>> UpdateMyProfile(
        [FromBody] UpdateMyProfileRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var profile = await _settingsService.UpdateMyProfileAsync(User.GetUserId(), request, cancellationToken);
            return Ok(profile);
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
    /// Changes the signed-in Support Staff's own password. Requires the
    /// current password. Does not affect the caller's current session - the
    /// existing JWT remains valid until it naturally expires (same as
    /// ApplicantController.ChangePassword).
    /// </summary>
    [HttpPut("password")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ChangeMyPassword(
        [FromBody] ChangePasswordRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            await _settingsService.ChangeMyPasswordAsync(User.GetUserId(), request, cancellationToken);
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
