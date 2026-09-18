using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>Landing dashboard for the Support Staff role (BISAASS-51).</summary>
[Authorize(Roles = "SupportStaff")]
[ApiController]
[Route("api/support-staff/dashboard")]
public class SupportStaffDashboardController : ControllerBase
{
    private readonly ISupportStaffDashboardService _dashboardService;

    public SupportStaffDashboardController(ISupportStaffDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    /// <summary>
    /// Support Staff-only: pending-verification, verified-today, and
    /// flagged document counts, plus the total number of applicants.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(SupportStaffDashboardResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<SupportStaffDashboardResponse>> GetDashboard(CancellationToken cancellationToken)
    {
        var dashboard = await _dashboardService.GetDashboardAsync(cancellationToken);
        return Ok(dashboard);
    }
}
