using BCAS.Api.Exceptions;
using BCAS.Api.Extensions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>
/// The school calendar behind the scholarship lock: any Admin can read it
/// (and whether they may override the lock); only a Super Admin changes it.
/// </summary>
[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin/semesters")]
public class AdminSemestersController : ControllerBase
{
    private readonly ISemesterService _semesterService;
    private readonly IAuditLogService _auditLogService;

    public AdminSemestersController(ISemesterService semesterService, IAuditLogService auditLogService)
    {
        _semesterService = semesterService;
        _auditLogService = auditLogService;
    }

    /// <summary>Every semester, the one in progress today (if any), and whether the caller is a Super Admin.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(SemesterOverviewResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<SemesterOverviewResponse>> GetOverview(CancellationToken cancellationToken)
    {
        return Ok(await _semesterService.GetOverviewAsync(User.GetUserId(), cancellationToken));
    }

    /// <summary>Super Admin only: adds a semester. Dates can't overlap another semester.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(SemesterResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<SemesterResponse>> Create([FromBody] CreateSemesterRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var created = await _semesterService.CreateAsync(User.GetUserId(), request, cancellationToken);
            await _auditLogService.LogAsync(
                User, "SemesterCreated", $"\"{created.Name}\" ({created.StartDate:yyyy-MM-dd} to {created.EndDate:yyyy-MM-dd})", cancellationToken);
            return CreatedAtAction(nameof(GetOverview), new { id = created.SemesterId }, created);
        }
        catch (InvalidSemesterException ex)
        {
            return BadRequest(new ProblemDetails { Title = "Invalid semester", Detail = ex.Message, Status = StatusCodes.Status400BadRequest });
        }
        catch (SuperAdminRequiredException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new ProblemDetails
            {
                Title = "Full Admin controls required",
                Detail = ex.Message,
                Status = StatusCodes.Status403Forbidden,
            });
        }
    }

    /// <summary>Super Admin only: removes a semester.</summary>
    [HttpDelete("{semesterId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int semesterId, CancellationToken cancellationToken)
    {
        try
        {
            await _semesterService.DeleteAsync(User.GetUserId(), semesterId, cancellationToken);
            await _auditLogService.LogAsync(User, "SemesterDeleted", $"Semester #{semesterId}", cancellationToken);
            return NoContent();
        }
        catch (SemesterNotFoundException ex)
        {
            return NotFound(new ProblemDetails { Title = "Semester not found", Detail = ex.Message, Status = StatusCodes.Status404NotFound });
        }
        catch (SuperAdminRequiredException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new ProblemDetails
            {
                Title = "Full Admin controls required",
                Detail = ex.Message,
                Status = StatusCodes.Status403Forbidden,
            });
        }
    }
}
