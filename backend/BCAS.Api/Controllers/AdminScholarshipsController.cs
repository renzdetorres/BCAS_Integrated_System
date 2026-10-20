using BCAS.Api.Exceptions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>Admin-Registrar scholarship slot management (BISAASS-32).</summary>
[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin/scholarships")]
public class AdminScholarshipsController : ControllerBase
{
    private readonly IAdminScholarshipsService _scholarshipsService;
    private readonly IAuditLogService _auditLogService;

    public AdminScholarshipsController(IAdminScholarshipsService scholarshipsService, IAuditLogService auditLogService)
    {
        _scholarshipsService = scholarshipsService;
        _auditLogService = auditLogService;
    }

    /// <summary>Admin-only: every scholarship regardless of active status, with remaining/occupied slot counts.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AdminScholarshipResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AdminScholarshipResponse>>> GetAll(CancellationToken cancellationToken)
    {
        var scholarships = await _scholarshipsService.GetAllAsync(cancellationToken);
        return Ok(scholarships);
    }

    /// <summary>Admin-only: creates a new scholarship slot. RemainingSlots starts equal to TotalSlots.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(AdminScholarshipResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AdminScholarshipResponse>> Create(
        [FromBody] CreateScholarshipRequest request, CancellationToken cancellationToken)
    {
        var created = await _scholarshipsService.CreateAsync(request, cancellationToken);
        await _auditLogService.LogAsync(User, "ScholarshipCreated", $"\"{created.Name}\" ({created.TotalSlots} slots)", cancellationToken);
        return CreatedAtAction(nameof(GetAll), new { id = created.ScholarshipId }, created);
    }

    /// <summary>
    /// Admin-only: updates a scholarship's name, type, total slots, and
    /// minimum grade average. Total slots can't be set below the number of
    /// slots already occupied by accepted applications.
    /// </summary>
    [HttpPut("{scholarshipId:int}")]
    [ProducesResponseType(typeof(AdminScholarshipResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminScholarshipResponse>> Update(
        int scholarshipId, [FromBody] UpdateScholarshipRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _scholarshipsService.UpdateAsync(scholarshipId, request, cancellationToken);
            await _auditLogService.LogAsync(User, "ScholarshipUpdated", $"\"{updated.Name}\"", cancellationToken);
            return Ok(updated);
        }
        catch (InvalidTotalSlotsException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid total slots",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
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
    }

    /// <summary>
    /// Admin-only: activates or deactivates a scholarship without deleting
    /// it. A deactivated scholarship immediately stops appearing in the
    /// applicant-facing catalog and can no longer be applied against.
    /// </summary>
    [HttpPatch("{scholarshipId:int}/status")]
    [ProducesResponseType(typeof(AdminScholarshipResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminScholarshipResponse>> SetActiveStatus(
        int scholarshipId, [FromBody] SetActiveStatusRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _scholarshipsService.SetActiveStatusAsync(scholarshipId, request.IsActive!.Value, cancellationToken);
            await _auditLogService.LogAsync(
                User,
                updated.IsActive ? "ScholarshipActivated" : "ScholarshipDeactivated",
                $"\"{updated.Name}\"",
                cancellationToken);
            return Ok(updated);
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
    }
}
