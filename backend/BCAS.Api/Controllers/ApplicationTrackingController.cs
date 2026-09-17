using BCAS.Api.Extensions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

[Authorize(Roles = "Applicant")]
[ApiController]
[Route("api/application-tracking")]
public class ApplicationTrackingController : ControllerBase
{
    private readonly IApplicationTrackingService _trackingService;

    public ApplicationTrackingController(IApplicationTrackingService trackingService)
    {
        _trackingService = trackingService;
    }

    /// <summary>
    /// The signed-in applicant's admission and scholarship applications,
    /// each with its current workflow step, plus their document checklist
    /// (verification status and flagged/rejected reasons).
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApplicationTrackingResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApplicationTrackingResponse>> GetMyTracking(CancellationToken cancellationToken)
    {
        var tracking = await _trackingService.GetMyTrackingAsync(User.GetUserId(), cancellationToken);
        return Ok(tracking);
    }
}
