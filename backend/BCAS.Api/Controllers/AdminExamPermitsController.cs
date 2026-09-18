using BCAS.Api.Exceptions;
using BCAS.Api.Extensions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>Admin-Registrar exam permit generation and release (BISAASS-30).</summary>
[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin/exam-permits")]
public class AdminExamPermitsController : ControllerBase
{
    private readonly IAdminExamPermitService _examPermitService;

    public AdminExamPermitsController(IAdminExamPermitService examPermitService)
    {
        _examPermitService = examPermitService;
    }

    /// <summary>
    /// Admin-only: every applicant with an exam schedule selected, their
    /// document-verification status, and permit release status.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AdminExamPermitListItemResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AdminExamPermitListItemResponse>>> GetAll(CancellationToken cancellationToken)
    {
        var permits = await _examPermitService.GetAllAsync(cancellationToken);
        return Ok(permits);
    }

    /// <summary>
    /// Admin-only: generates and releases the applicant's exam permit,
    /// blocked until their required documents are all verified. Safe to
    /// call again once released - it's a no-op.
    /// </summary>
    [HttpPost("{userId:guid}/release")]
    [ProducesResponseType(typeof(AdminExamPermitListItemResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AdminExamPermitListItemResponse>> Release(Guid userId, CancellationToken cancellationToken)
    {
        try
        {
            var released = await _examPermitService.ReleaseAsync(userId, User.GetUserId(), cancellationToken);
            return Ok(released);
        }
        catch (NoExamScheduleSelectedException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "No exam schedule selected",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
        catch (DocumentsNotVerifiedException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Documents not verified",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
    }
}
