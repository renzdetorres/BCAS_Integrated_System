using BCAS.Api.Exceptions;
using BCAS.Api.Extensions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>
/// Admin-only: registrations flagged as a potential duplicate of an
/// existing applicant account (name closely matches - see
/// DuplicateApplicantService). Flagging never blocks registration or merges
/// anything automatically; this queue is where a human makes that call.
/// </summary>
[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin/duplicate-applicants")]
public class AdminDuplicateApplicantsController : ControllerBase
{
    private readonly IDuplicateApplicantService _duplicateApplicantService;
    private readonly IAuditLogService _auditLogService;

    public AdminDuplicateApplicantsController(IDuplicateApplicantService duplicateApplicantService, IAuditLogService auditLogService)
    {
        _duplicateApplicantService = duplicateApplicantService;
        _auditLogService = auditLogService;
    }

    /// <summary>Every flag still awaiting review, most recently detected first.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<DuplicateApplicantFlagResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<DuplicateApplicantFlagResponse>>> GetOpen(CancellationToken cancellationToken)
    {
        var flags = await _duplicateApplicantService.GetOpenFlagsAsync(cancellationToken);
        return Ok(flags);
    }

    /// <summary>
    /// Marks a flag as either 'Dismissed' (not actually the same person) or
    /// 'ConfirmedDuplicate'. Neither outcome touches the underlying accounts
    /// or application records - resolving is metadata-only, clearing the
    /// flag from the open queue.
    /// </summary>
    [HttpPost("{flagId:guid}/resolve")]
    [ProducesResponseType(typeof(DuplicateApplicantFlagResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DuplicateApplicantFlagResponse>> Resolve(
        Guid flagId,
        [FromBody] ResolveDuplicateFlagRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var resolved = await _duplicateApplicantService.ResolveFlagAsync(flagId, User.GetUserId(), request, cancellationToken);
            await _auditLogService.LogAsync(
                User,
                "DuplicateFlagResolved",
                $"{resolved.NewUserEmail} vs {resolved.MatchedUserEmail}: {resolved.Status}",
                cancellationToken);
            return Ok(resolved);
        }
        catch (InvalidDuplicateFlagStatusException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid status",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
        catch (DuplicateFlagNotFoundException ex)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Flag not found",
                Detail = ex.Message,
                Status = StatusCodes.Status404NotFound,
            });
        }
    }
}
