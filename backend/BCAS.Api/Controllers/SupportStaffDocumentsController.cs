using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>
/// Support Staff's Document Verification screen (BISAASS-51 quick link).
/// Currently a read-only stub - approve/reject/flag actions, required
/// reasons, and reviewer tracking land with BISAASS-52.
/// </summary>
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

    /// <summary>Support Staff-only: every non-archived document awaiting review or currently flagged, most recently uploaded first.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AdminDocumentListItemResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AdminDocumentListItemResponse>>> GetPendingAndFlagged(CancellationToken cancellationToken)
    {
        var documents = await _documentsService.GetPendingAndFlaggedAsync(cancellationToken);
        return Ok(documents);
    }
}
