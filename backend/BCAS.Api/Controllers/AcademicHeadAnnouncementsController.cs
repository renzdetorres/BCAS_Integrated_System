using BCAS.Api.Exceptions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>
/// Academic Head announcements management, if authorized (BISAASS-48).
/// Gated behind SystemSettingKeys.AcademicHeadAnnouncementManagementAuthorized
/// (toggled by an Admin-Registrar via SystemSettingsController); when
/// authorized, functionality matches AdminAnnouncementsController
/// (BISAASS-36) exactly, since both delegate to the same underlying
/// announcements table.
/// </summary>
[Authorize(Roles = "AcademicHead")]
[ApiController]
[Route("api/academic-head/announcements")]
public class AcademicHeadAnnouncementsController : ControllerBase
{
    private readonly IAcademicHeadAnnouncementService _announcementService;

    public AcademicHeadAnnouncementsController(IAcademicHeadAnnouncementService announcementService)
    {
        _announcementService = announcementService;
    }

    /// <summary>Academic Head-only, if authorized: every announcement regardless of active status, most recently posted first.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AdminAnnouncementResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<IReadOnlyList<AdminAnnouncementResponse>>> GetAll(CancellationToken cancellationToken)
    {
        try
        {
            var announcements = await _announcementService.GetAllAsync(cancellationToken);
            return Ok(announcements);
        }
        catch (AcademicHeadNotAuthorizedException ex)
        {
            return NotAuthorized(ex);
        }
    }

    /// <summary>
    /// Academic Head-only, if authorized: creates a new Admission or
    /// Scholarship announcement as a draft. It does not appear to
    /// applicants until posted (activated) via the status endpoint below.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(AdminAnnouncementResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<AdminAnnouncementResponse>> Create(
        [FromBody] CreateAnnouncementRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var created = await _announcementService.CreateAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetAll), new { id = created.AnnouncementId }, created);
        }
        catch (AcademicHeadNotAuthorizedException ex)
        {
            return NotAuthorized(ex);
        }
        catch (InvalidAnnouncementCategoryException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid category",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
    }

    /// <summary>
    /// Academic Head-only, if authorized: posts (activates) or deactivates
    /// an announcement without deleting it. A deactivated announcement
    /// immediately stops appearing to applicants.
    /// </summary>
    [HttpPatch("{announcementId:int}/status")]
    [ProducesResponseType(typeof(AdminAnnouncementResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminAnnouncementResponse>> SetActiveStatus(
        int announcementId, [FromBody] SetActiveStatusRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _announcementService.SetActiveStatusAsync(announcementId, request.IsActive!.Value, cancellationToken);
            return Ok(updated);
        }
        catch (AcademicHeadNotAuthorizedException ex)
        {
            return NotAuthorized(ex);
        }
        catch (AnnouncementNotFoundException ex)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Announcement not found",
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
