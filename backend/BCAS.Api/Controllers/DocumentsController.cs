using BCAS.Api.Constants;
using BCAS.Api.Exceptions;
using BCAS.Api.Extensions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

[Authorize(Roles = "Applicant")]
[ApiController]
[Route("api/documents")]
public class DocumentsController : ControllerBase
{
    private readonly IApplicantDocumentService _documentService;

    public DocumentsController(IApplicantDocumentService documentService)
    {
        _documentService = documentService;
    }

    /// <summary>
    /// The signed-in applicant's requirements checklist - specific to their
    /// admission application type - paired with each document's upload and
    /// verification status.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(DocumentChecklistResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<DocumentChecklistResponse>> GetMyChecklist(CancellationToken cancellationToken)
    {
        try
        {
            var checklist = await _documentService.GetMyChecklistAsync(User.GetUserId(), cancellationToken);
            return Ok(checklist);
        }
        catch (NoAdmissionApplicationException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "No admission application",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
    }

    /// <summary>
    /// Uploads (or re-uploads) a document for the signed-in applicant.
    /// Only PDF files are accepted. Re-uploading replaces the previous file
    /// and resets its status to Pending for re-verification.
    /// </summary>
    [HttpPut("{documentType}")]
    [RequestSizeLimit(DocumentConstants.MaxFileSizeBytes + 1024)]
    [ProducesResponseType(typeof(DocumentChecklistItemResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<DocumentChecklistItemResponse>> UploadDocument(
        string documentType,
        IFormFile? file,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "File required",
                Detail = "Attach a PDF file to upload.",
                Status = StatusCodes.Status400BadRequest,
            });
        }

        using var memoryStream = new MemoryStream();
        await file.CopyToAsync(memoryStream, cancellationToken);

        try
        {
            var result = await _documentService.UploadDocumentAsync(
                User.GetUserId(),
                documentType,
                file.FileName,
                file.ContentType,
                memoryStream.ToArray(),
                cancellationToken);

            return Ok(result);
        }
        catch (InvalidDocumentTypeException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid document type",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
        catch (InvalidDocumentFileException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid file",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
        catch (NoAdmissionApplicationException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "No admission application",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
    }
}
