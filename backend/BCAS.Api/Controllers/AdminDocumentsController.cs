using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>Admin-Registrar's documents oversight view (BISAASS-34).</summary>
[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin/documents")]
public class AdminDocumentsController : ControllerBase
{
    private readonly IAdminDocumentsService _documentsService;

    public AdminDocumentsController(IAdminDocumentsService documentsService)
    {
        _documentsService = documentsService;
    }

    /// <summary>
    /// Admin-only: every document submitted by any applicant, most recently
    /// uploaded first, with its verification status and, for a
    /// flagged/rejected document, the reason given. All filters are
    /// optional and combine with AND; search matches the applicant's name
    /// or email.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AdminDocumentListItemResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AdminDocumentListItemResponse>>> Search(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] string? documentType,
        CancellationToken cancellationToken)
    {
        var documents = await _documentsService.SearchAsync(search, status, documentType, cancellationToken);
        return Ok(documents);
    }
}
