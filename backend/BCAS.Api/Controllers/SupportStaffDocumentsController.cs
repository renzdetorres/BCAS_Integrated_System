using BCAS.Api.Exceptions;
using BCAS.Api.Extensions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>Support Staff's Document Verification screen (BISAASS-51 quick link; approve/reject/flag added by BISAASS-52).</summary>
[Authorize(Roles = "SupportStaff")]
[ApiController]
[Route("api/support-staff/documents")]
public class SupportStaffDocumentsController : ControllerBase
{
    private readonly ISupportStaffDocumentsService _documentsService;

    public SupportStaffDocumentsController(ISupportStaffDocumentsService documentsService)
    {
        _documentsService = documentsService;
    }

    /// <summary>
    /// Support Staff-only: with no userId, every non-archived document
    /// awaiting review or currently flagged, most recently uploaded first.
    /// With userId (set when navigating here from Applicant Records -
    /// BISAASS-53), every non-archived document belonging to that one
    /// applicant instead, regardless of status.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AdminDocumentListItemResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AdminDocumentListItemResponse>>> GetDocuments(
        [FromQuery] Guid? userId, CancellationToken cancellationToken)
    {
        var documents = userId.HasValue
            ? await _documentsService.GetByApplicantAsync(userId.Value, cancellationToken)
            : await _documentsService.GetPendingAndFlaggedAsync(cancellationToken);
        return Ok(documents);
    }

    /// <summary>
    /// Support Staff-only: approves (Verified), rejects, or flags a
    /// document. Rejecting or flagging requires a Reason. Records the
    /// signed-in Support Staff account as the reviewer. The applicant can
    /// re-upload a corrected document afterward, which resets it to
    /// Pending for re-review (ApplicantDocumentRepository.UpsertAsync).
    /// </summary>
    [HttpPost("{documentId:guid}/review")]
    [ProducesResponseType(typeof(AdminDocumentListItemResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminDocumentListItemResponse>> ReviewDocument(
        Guid documentId,
        [FromBody] ReviewDocumentRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _documentsService.ReviewDocumentAsync(documentId, User.GetUserId(), request, cancellationToken);
            return Ok(updated);
        }
        catch (InvalidDocumentReviewStatusException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid review status",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
        catch (DocumentReviewReasonRequiredException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Reason required",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
        catch (DocumentNotFoundException ex)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Document not found",
                Detail = ex.Message,
                Status = StatusCodes.Status404NotFound,
            });
        }
    }
}
