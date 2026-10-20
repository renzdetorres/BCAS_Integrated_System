using BCAS.Api.Exceptions;
using BCAS.Api.Extensions;
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
    /// or scholarship name; archived (BISAASS-35) narrows to only archived
    /// (true) or only non-archived (false) applications - omitted, this
    /// list is unfiltered by archive state, unchanged since BISAASS-28.
    /// Each item already carries its own full detail (applicant,
    /// type-specific fields, status), so selecting one from the list needs
    /// no follow-up call.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AdminApplicationListItemResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AdminApplicationListItemResponse>>> Search(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] string? category,
        [FromQuery] string? program,
        [FromQuery] bool? archived,
        CancellationToken cancellationToken)
    {
        var applications = await _applicationsService.SearchAsync(search, status, category, program, archived, cancellationToken);
        return Ok(applications);
    }

    /// <summary>
    /// Admin-only (BISAASS-31): sets an admission or scholarship
    /// application's status, with optional remarks. Category must match
    /// the application's own category (Admission or Scholarship). The new
    /// status must be a forward move through that category's ordered
    /// workflow (BISAASS-56/57); every change is recorded in the
    /// status-history audit trail.
    /// </summary>
    [HttpPatch("{applicationId:guid}/status")]
    [ProducesResponseType(typeof(AdminApplicationListItemResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminApplicationListItemResponse>> UpdateStatus(
        Guid applicationId,
        [FromBody] UpdateApplicationStatusRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _applicationsService.UpdateStatusAsync(applicationId, request, User.GetUserId(), cancellationToken);
            return Ok(updated);
        }
        catch (InvalidApplicationCategoryException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid category",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
        catch (InvalidApplicationStatusException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid status",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
        catch (InvalidStatusTransitionException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid status transition",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
        catch (ApplicationNotFoundException ex)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Application not found",
                Detail = ex.Message,
                Status = StatusCodes.Status404NotFound,
            });
        }
    }

    /// <summary>
    /// Admin-only (BISAASS-56): the full status-change audit trail for one
    /// application, oldest first - who changed it, when, and any remarks
    /// given at the time. Category must match the application's own
    /// category (Admission or Scholarship).
    /// </summary>
    [HttpGet("{applicationId:guid}/status-history")]
    [ProducesResponseType(typeof(IReadOnlyList<ApplicationStatusHistoryEntryResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<ApplicationStatusHistoryEntryResponse>>> GetStatusHistory(
        Guid applicationId,
        [FromQuery] string category,
        CancellationToken cancellationToken)
    {
        try
        {
            var history = await _applicationsService.GetStatusHistoryAsync(applicationId, category, cancellationToken);
            return Ok(history);
        }
        catch (ApplicationNotFoundException ex)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Application not found",
                Detail = ex.Message,
                Status = StatusCodes.Status404NotFound,
            });
        }
    }

    /// <summary>
    /// Admin-only (BISAASS-35): archives a completed/inactive (Approved or
    /// Rejected) admission or scholarship application, with an optional
    /// reason. Metadata-only - the record (and, for an Admission
    /// application, the applicant's documents) is flagged, never deleted,
    /// keeping it retrievable for the school's 5-year retention practice.
    /// </summary>
    [HttpPost("{applicationId:guid}/archive")]
    [ProducesResponseType(typeof(AdminApplicationListItemResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminApplicationListItemResponse>> Archive(
        Guid applicationId,
        [FromBody] ArchiveApplicationRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var archived = await _applicationsService.ArchiveAsync(applicationId, request, User.GetUserId(), cancellationToken);
            return Ok(archived);
        }
        catch (InvalidApplicationCategoryException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid category",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
        catch (ApplicationNotArchivableException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Application not archivable",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
        catch (ApplicationAlreadyArchivedException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Already archived",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
        catch (ApplicationNotFoundException ex)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Application not found",
                Detail = ex.Message,
                Status = StatusCodes.Status404NotFound,
            });
        }
    }

    /// <summary>
    /// Admin-only: archives every listed application in one call, each
    /// succeeding or failing independently (see
    /// AdminApplicationsService.BulkArchiveAsync) - for clearing a whole
    /// filtered page of completed records at once instead of one row at a
    /// time. Always returns 200; check the response body's Failures list
    /// for any rows that couldn't be archived (e.g. already archived, or
    /// not yet in a completed status).
    /// </summary>
    [HttpPost("bulk-archive")]
    [ProducesResponseType(typeof(BulkOperationResultResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<BulkOperationResultResponse>> BulkArchive(
        [FromBody] BulkArchiveRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _applicationsService.BulkArchiveAsync(request, User.GetUserId(), cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Admin-only: promotes a Waitlisted scholarship application into a
    /// freshly-available slot - atomically reserves it and moves the
    /// application to "Submitted", where it re-enters the ordinary
    /// Evaluator screening workflow.
    /// </summary>
    [HttpPost("{applicationId:guid}/promote-from-waitlist")]
    [ProducesResponseType(typeof(AdminApplicationListItemResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminApplicationListItemResponse>> PromoteFromWaitlist(
        Guid applicationId,
        CancellationToken cancellationToken)
    {
        try
        {
            var promoted = await _applicationsService.PromoteFromWaitlistAsync(applicationId, User.GetUserId(), cancellationToken);
            return Ok(promoted);
        }
        catch (ScholarshipApplicationNotWaitlistedException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Not waitlisted",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
        catch (ScholarshipNotAvailableException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "No slot available",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
        catch (ApplicationNotFoundException ex)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Application not found",
                Detail = ex.Message,
                Status = StatusCodes.Status404NotFound,
            });
        }
    }
}
