using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/dashboard")]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    /// <summary>
    /// Upcoming scholarship/document deadlines and the enrollment period,
    /// shown on the applicant dashboard.
    /// </summary>
    [HttpGet("deadlines")]
    [ProducesResponseType(typeof(IReadOnlyList<DeadlineResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IReadOnlyList<DeadlineResponse>>> GetDeadlines(CancellationToken cancellationToken)
    {
        var deadlines = await _dashboardService.GetUpcomingDeadlinesAsync(cancellationToken);
        return Ok(deadlines);
    }
}
