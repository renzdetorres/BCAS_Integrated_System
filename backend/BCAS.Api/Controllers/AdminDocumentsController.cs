using BCAS.Api.Data;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;

namespace BCAS.Api.Controllers;

/// <summary>Admin-Registrar's documents oversight view (BISAASS-34).</summary>
[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin/documents")]
public class AdminDocumentsController : ControllerBase
{
    private readonly IAdminDocumentsService _documentsService;
    private readonly IAdminDocumentsRepository _documentsRepository;

    public AdminDocumentsController(IAdminDocumentsService documentsService, IAdminDocumentsRepository documentsRepository)
    {
        _documentsService = documentsService;
        _documentsRepository = documentsRepository;
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

    /// <summary>
    /// Admin-only: one document's uploaded file. Uploads are PDF-only
    /// (ApplicantDocumentService checks extension, type and signature), and
    /// only a PDF is served inline for the in-browser preview; anything else
    /// is sent as a plain download so stored content can never render as a
    /// page on this origin.
    /// </summary>
    [HttpGet("{documentId:guid}/file")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetFile(Guid documentId, CancellationToken cancellationToken)
    {
        var file = await _documentsRepository.GetFileAsync(documentId, cancellationToken);
        if (file is null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Document not found",
                Detail = $"No document found with id '{documentId}'.",
                Status = StatusCodes.Status404NotFound,
            });
        }

        var isPdf = string.Equals(file.ContentType, "application/pdf", StringComparison.OrdinalIgnoreCase);
        var disposition = new ContentDispositionHeaderValue(isPdf ? "inline" : "attachment");
        disposition.SetHttpFileName(file.FileName);
        Response.Headers[HeaderNames.ContentDisposition] = disposition.ToString();
        Response.Headers[HeaderNames.XContentTypeOptions] = "nosniff";
        return File(file.FileData, isPdf ? "application/pdf" : "application/octet-stream");
    }
}
