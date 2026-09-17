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

    public ApplicantController(IApplicantProfileService profileService)
    {
        _profileService = profileService;
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
}
