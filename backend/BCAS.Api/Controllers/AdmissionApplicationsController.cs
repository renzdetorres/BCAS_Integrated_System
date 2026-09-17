using BCAS.Api.Exceptions;
using BCAS.Api.Extensions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

[Authorize(Roles = "Applicant")]
[ApiController]
[Route("api/admission-applications")]
public class AdmissionApplicationsController : ControllerBase
{
    private readonly IAdmissionApplicationService _applicationService;

    public AdmissionApplicationsController(IAdmissionApplicationService applicationService)
    {
        _applicationService = applicationService;
    }

    /// <summary>Lists the signed-in applicant's own admission applications, most recent first.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AdmissionApplicationResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AdmissionApplicationResponse>>> GetMine(CancellationToken cancellationToken)
    {
        var applications = await _applicationService.GetMyApplicationsAsync(User.GetUserId(), cancellationToken);
        return Ok(applications);
    }

    /// <summary>
    /// Submits a new admission application for the signed-in applicant.
    /// Blocked until the applicant's profile is complete. Enters the
    /// admission workflow at "Submitted".
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(AdmissionApplicationResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AdmissionApplicationResponse>> Submit(
        [FromBody] SubmitAdmissionApplicationRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var response = await _applicationService.SubmitAsync(User.GetUserId(), request, cancellationToken);
            return CreatedAtAction(nameof(GetMine), response);
        }
        catch (AdmissionApplicationsClosedException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Admission applications closed",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
        catch (InvalidApplicationTypeException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid application type",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
        catch (ProfileIncompleteException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Profile incomplete",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
    }
}
