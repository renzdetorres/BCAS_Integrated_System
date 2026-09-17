using BCAS.Api.Exceptions;
using BCAS.Api.Extensions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

[Authorize(Roles = "Applicant")]
[ApiController]
[Route("api/scholarship-applications")]
public class ScholarshipApplicationsController : ControllerBase
{
    private readonly IScholarshipApplicationService _applicationService;

    public ScholarshipApplicationsController(IScholarshipApplicationService applicationService)
    {
        _applicationService = applicationService;
    }

    /// <summary>Lists the signed-in applicant's own scholarship applications, most recent first.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ScholarshipApplicationResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ScholarshipApplicationResponse>>> GetMine(CancellationToken cancellationToken)
    {
        var applications = await _applicationService.GetMyApplicationsAsync(User.GetUserId(), cancellationToken);
        return Ok(applications);
    }

    /// <summary>
    /// Submits a scholarship application against a target slot. Blocked
    /// until the applicant's profile is complete, the scholarship is still
    /// active, and it has at least one remaining slot (reserved atomically
    /// so concurrent submissions can't oversell it). Enters the
    /// scholarship workflow at "Submitted".
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ScholarshipApplicationResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ScholarshipApplicationResponse>> Submit(
        [FromBody] SubmitScholarshipApplicationRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var response = await _applicationService.SubmitAsync(User.GetUserId(), request, cancellationToken);
            return CreatedAtAction(nameof(GetMine), response);
        }
        catch (ScholarshipNotFoundException ex)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Scholarship not found",
                Detail = ex.Message,
                Status = StatusCodes.Status404NotFound,
            });
        }
        catch (ScholarshipNotAvailableException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Scholarship not available",
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
