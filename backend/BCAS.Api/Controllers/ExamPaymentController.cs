using BCAS.Api.Constants;
using BCAS.Api.Exceptions;
using BCAS.Api.Extensions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;

namespace BCAS.Api.Controllers;

/// <summary>The applicant's entrance exam payment: see the amount and QR code, upload proof, follow its review.</summary>
[Authorize(Roles = "Applicant")]
[ApiController]
[Route("api/exam-payment")]
public class ExamPaymentController : ControllerBase
{
    private readonly IExamPaymentService _paymentService;

    public ExamPaymentController(IExamPaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ExamPaymentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ExamPaymentResponse>> GetMyPayment(CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _paymentService.GetMyPaymentAsync(User.GetUserId(), cancellationToken));
        }
        catch (NoAdmissionApplicationException ex)
        {
            return Problem(ex.Message, title: "No admission application", statusCode: StatusCodes.Status400BadRequest);
        }
    }

    /// <summary>Uploads (or replaces) the proof of payment. Resets the payment to Pending for staff to verify.</summary>
    [HttpPut("proof")]
    [RequestSizeLimit(DocumentConstants.MaxFileSizeBytes + 4096)]
    [ProducesResponseType(typeof(ExamPaymentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ExamPaymentResponse>> SubmitProof(
        IFormFile? file,
        [FromForm] string? referenceNumber,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return Problem("Attach your proof of payment.", title: "File required", statusCode: StatusCodes.Status400BadRequest);
        }

        using var stream = new MemoryStream();
        await file.CopyToAsync(stream, cancellationToken);

        try
        {
            var response = await _paymentService.SubmitProofAsync(
                User.GetUserId(), referenceNumber, file.FileName, file.ContentType, stream.ToArray(), cancellationToken);
            return Ok(response);
        }
        catch (ExamPaymentException ex)
        {
            return Problem(ex.Message, title: "Payment not accepted", statusCode: StatusCodes.Status400BadRequest);
        }
        catch (NoAdmissionApplicationException ex)
        {
            return Problem(ex.Message, title: "No admission application", statusCode: StatusCodes.Status400BadRequest);
        }
    }

    /// <summary>The applicant's own uploaded proof, served inline for preview.</summary>
    [HttpGet("proof")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMyProof(CancellationToken cancellationToken)
    {
        var file = await _paymentService.GetMyProofFileAsync(User.GetUserId(), cancellationToken);
        return file is null ? NotFound() : ServeInline(this, file);
    }

    internal static IActionResult ServeInline(ControllerBase controller, DocumentFile file)
    {
        var inlineType = DocumentConstants.InlineContentType(file.ContentType);
        var disposition = new ContentDispositionHeaderValue(inlineType is not null ? "inline" : "attachment");
        disposition.SetHttpFileName(file.FileName);
        controller.Response.Headers[HeaderNames.ContentDisposition] = disposition.ToString();
        controller.Response.Headers[HeaderNames.XContentTypeOptions] = "nosniff";
        return controller.File(file.FileData, inlineType ?? "application/octet-stream");
    }
}
