using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>Admin-Registrar's system-wide application list (BISAASS-28).</summary>
[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin/applications")]
public class AdminApplicationsController : ControllerBase
{
    private readonly IAdminApplicationsService _applicationsService;

    public AdminApplicationsController(IAdminApplicationsService applicationsService)
    {
        _applicationsService = applicationsService;
    }

    /// <summary>
    /// Admin-only: every admission and scholarship application, most recent
    /// first. All filters are optional and combine with AND; search matches
    /// the applicant's name or email, program matches the admission course
    /// or scholarship name. Each item already carries its own full detail
    /// (applicant, type-specific fields, status), so selecting one from the
    /// list needs no follow-up call.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AdminApplicationListItemResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AdminApplicationListItemResponse>>> Search(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] string? category,
        [FromQuery] string? program,
        CancellationToken cancellationToken)
    {
        var applications = await _applicationsService.SearchAsync(search, status, category, program, cancellationToken);
        return Ok(applications);
    }
}
