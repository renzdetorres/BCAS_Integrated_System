using BCAS.Api.Constants;
using BCAS.Api.Exceptions;
using BCAS.Api.Extensions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

// AcademicHead is read-only here by virtue of this controller having no
// write endpoints - BISAASS-47 gives Academic Head read access to this
// Admin-Registrar oversight screen "as needed for approval decisions",
// with every figure scoped to their assigned department.
[Authorize(Roles = "Admin,AcademicHead")]
[ApiController]
[Route("api/admin/dashboard")]
public class AdminDashboardController : ControllerBase
{
    private readonly IAdminDashboardService _dashboardService;
    private readonly IAcademicHeadScopeService _scopeService;

    public AdminDashboardController(IAdminDashboardService dashboardService, IAcademicHeadScopeService scopeService)
    {
        _dashboardService = dashboardService;
        _scopeService = scopeService;
    }

    /// <summary>
    /// Admin and Academic Head: admission application analytics - totals,
    /// pending/approved/rejected counts, applicants by program, and the
    /// most recently submitted applications. School-wide for an Admin; only
    /// the caller's assigned department for an Academic Head.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(AdminDashboardResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AdminDashboardResponse>> GetDashboard([FromQuery] string? academicYear, CancellationToken cancellationToken)
    {
        // Narrows every figure to one academic year (e.g. 2025-2026); left out, the dashboard covers all years.
        if (!string.IsNullOrWhiteSpace(academicYear) && !AcademicStructure.IsValidAcademicYear(academicYear))
        {
            return BadRequest(new ProblemDetails { Title = "Invalid academic year", Detail = "Use two consecutive years, like 2025-2026.", Status = StatusCodes.Status400BadRequest });
        }

        academicYear = string.IsNullOrWhiteSpace(academicYear) ? null : academicYear;
        string? department = null;
        if (User.IsInRole("AcademicHead"))
        {
            try
            {
                department = await _scopeService.GetAssignedDepartmentAsync(User.GetUserId(), cancellationToken);
            }
            catch (AcademicHeadDepartmentNotAssignedException ex)
            {
                return BadRequest(new ProblemDetails
                {
                    Title = "No department assigned",
                    Detail = ex.Message,
                    Status = StatusCodes.Status400BadRequest,
                });
            }
        }

        var dashboard = await _dashboardService.GetDashboardAsync(department, academicYear, cancellationToken);
        return Ok(dashboard);
    }
}
