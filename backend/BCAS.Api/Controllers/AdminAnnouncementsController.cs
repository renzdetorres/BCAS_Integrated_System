using BCAS.Api.Exceptions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>Admin-Registrar announcements management (BISAASS-36).</summary>
[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin/announcements")]
public class AdminAnnouncementsController : ControllerBase
{
    private readonly IAdminAnnouncementService _announcementService;

    public AdminAnnouncementsController(IAdminAnnouncementService announcementService)
    {
        _announcementService = announcementService;
    }

    /// <summary>Admin-only: every announcement regardless of active status, most recently posted first.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AdminAnnouncementResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AdminAnnouncementResponse>>> GetAll(CancellationToken cancellationToken)
    {
        var announcements = await _announcementService.GetAllAsync(cancellationToken);
        return Ok(announcements);
    }

    /// <summary>
    /// Admin-only: creates a new Admission or Scholarship announcement as a
    /// draft. It does not appear to applicants until posted (activated) via
    /// the status endpoint below.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(AdminAnnouncementResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AdminAnnouncementResponse>> Create(
        [FromBody] CreateAnnouncementRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var created = await _announcementService.CreateAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetAll), new { id = created.AnnouncementId }, created);
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
    /// Admin-only: posts (activates) or deactivates an announcement without
    /// deleting it. A deactivated announcement immediately stops appearing
    /// to applicants.
    /// </summary>
    [HttpPatch("{announcementId:int}/status")]
    [ProducesResponseType(typeof(AdminAnnouncementResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminAnnouncementResponse>> SetActiveStatus(
        int announcementId, [FromBody] SetActiveStatusRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _announcementService.SetActiveStatusAsync(announcementId, request.IsActive!.Value, cancellationToken);
            return Ok(updated);
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
}
