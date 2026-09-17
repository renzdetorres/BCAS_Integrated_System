using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

// AcademicHead is read-only here by virtue of this controller having no
// write endpoints - BISAASS-47 gives Academic Head read access to this
// Admin-Registrar oversight screen "as needed for approval decisions".
[Authorize(Roles = "Admin,AcademicHead")]
[ApiController]
[Route("api/admin/dashboard")]
public class AdminDashboardController : ControllerBase
{
    private readonly IAdminDashboardService _dashboardService;

    public AdminDashboardController(IAdminDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    /// <summary>
    /// Admin and Academic Head: admission application analytics - totals,
    /// pending/approved/rejected counts, applicants by program, and the
    /// most recently submitted applications.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(AdminDashboardResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AdminDashboardResponse>> GetDashboard(CancellationToken cancellationToken)
    {
        var dashboard = await _dashboardService.GetDashboardAsync(cancellationToken);
        return Ok(dashboard);
    }
}
