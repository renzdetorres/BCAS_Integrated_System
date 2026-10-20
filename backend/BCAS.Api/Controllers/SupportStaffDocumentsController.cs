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
    /// document. Only works while the document is still Pending or Flagged
    /// (BISAASS-58) - Verified/Rejected are terminal. Rejecting or flagging
    /// requires a Reason. Records the signed-in Support Staff account as
    /// the reviewer. The applicant can re-upload a corrected document
    /// afterward, which resets it to Pending for re-review
    /// (ApplicantDocumentRepository.UpsertAsync).
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
        catch (DocumentAlreadyReviewedException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Already reviewed",
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

    /// <summary>
    /// Support Staff-only: applies the same review (Status + an optional
    /// shared Reason) to every listed document in one call - for triaging a
    /// whole filtered page of the verification queue at once. Always
    /// returns 200; check the response body's Failures list for any
    /// documents that couldn't be reviewed (not found, or already
    /// Verified/Rejected).
    /// </summary>
    [HttpPost("bulk-review")]
    [ProducesResponseType(typeof(BulkOperationResultResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<BulkOperationResultResponse>> BulkReview(
        [FromBody] BulkReviewDocumentsRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _documentsService.BulkReviewDocumentsAsync(request, User.GetUserId(), cancellationToken);
            return Ok(result);
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
    }

    /// <summary>
    /// Support Staff-only: the Document Archive (BISAASS-54) - every
    /// archived document, most recently updated first, optionally narrowed
    /// by search (applicant name/email) and/or documentType. Kept separate
    /// from the active verification queue above so archived documents
    /// never clutter it.
    /// </summary>
    [HttpGet("archive")]
    [ProducesResponseType(typeof(IReadOnlyList<AdminDocumentListItemResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AdminDocumentListItemResponse>>> SearchArchived(
        [FromQuery] string? search, [FromQuery] string? documentType, CancellationToken cancellationToken)
    {
        var documents = await _documentsService.SearchArchivedAsync(search, documentType, cancellationToken);
        return Ok(documents);
    }
}
