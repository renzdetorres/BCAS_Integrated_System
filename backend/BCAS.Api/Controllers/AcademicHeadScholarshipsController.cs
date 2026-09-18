using BCAS.Api.Exceptions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>
/// Academic Head scholarship slot management, if authorized (BISAASS-48).
/// Gated behind SystemSettingKeys.AcademicHeadScholarshipSlotManagementAuthorized
/// (toggled by an Admin-Registrar via SystemSettingsController); when
/// authorized, functionality matches AdminScholarshipsController (BISAASS-32)
/// exactly, since both delegate to the same underlying scholarship catalog.
/// </summary>
[Authorize(Roles = "AcademicHead")]
[ApiController]
[Route("api/academic-head/scholarships")]
public class AcademicHeadScholarshipsController : ControllerBase
{
    private readonly IAcademicHeadScholarshipsService _scholarshipsService;

    public AcademicHeadScholarshipsController(IAcademicHeadScholarshipsService scholarshipsService)
    {
        _scholarshipsService = scholarshipsService;
    }

    /// <summary>Academic Head-only, if authorized: every scholarship regardless of active status, with remaining/occupied slot counts.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AdminScholarshipResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<IReadOnlyList<AdminScholarshipResponse>>> GetAll(CancellationToken cancellationToken)
    {
        try
        {
            var scholarships = await _scholarshipsService.GetAllAsync(cancellationToken);
            return Ok(scholarships);
        }
        catch (AcademicHeadNotAuthorizedException ex)
        {
            return NotAuthorized(ex);
        }
    }

    /// <summary>Academic Head-only, if authorized: creates a new scholarship slot. RemainingSlots starts equal to TotalSlots.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(AdminScholarshipResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<AdminScholarshipResponse>> Create(
        [FromBody] CreateScholarshipRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var created = await _scholarshipsService.CreateAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetAll), new { id = created.ScholarshipId }, created);
        }
        catch (AcademicHeadNotAuthorizedException ex)
        {
            return NotAuthorized(ex);
        }
    }

    /// <summary>
    /// Academic Head-only, if authorized: updates a scholarship's name,
    /// type, total slots, and minimum grade average. Total slots can't be
    /// set below the number of slots already occupied by accepted
    /// applications.
    /// </summary>
    [HttpPut("{scholarshipId:int}")]
    [ProducesResponseType(typeof(AdminScholarshipResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminScholarshipResponse>> Update(
        int scholarshipId, [FromBody] UpdateScholarshipRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _scholarshipsService.UpdateAsync(scholarshipId, request, cancellationToken);
            return Ok(updated);
        }
        catch (AcademicHeadNotAuthorizedException ex)
        {
            return NotAuthorized(ex);
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
    /// Academic Head-only, if authorized: activates or deactivates a
    /// scholarship without deleting it. A deactivated scholarship
    /// immediately stops appearing in the applicant-facing catalog and can
    /// no longer be applied against.
    /// </summary>
    [HttpPatch("{scholarshipId:int}/status")]
    [ProducesResponseType(typeof(AdminScholarshipResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminScholarshipResponse>> SetActiveStatus(
        int scholarshipId, [FromBody] SetActiveStatusRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _scholarshipsService.SetActiveStatusAsync(scholarshipId, request.IsActive!.Value, cancellationToken);
            return Ok(updated);
        }
        catch (AcademicHeadNotAuthorizedException ex)
        {
            return NotAuthorized(ex);
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

    private ObjectResult NotAuthorized(AcademicHeadNotAuthorizedException ex) =>
        StatusCode(StatusCodes.Status403Forbidden, new ProblemDetails
        {
            Title = "Not authorized",
            Detail = ex.Message,
            Status = StatusCodes.Status403Forbidden,
        });
}
