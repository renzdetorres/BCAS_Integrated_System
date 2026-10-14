using BCAS.Api.Exceptions;
using BCAS.Api.Extensions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>
/// The entrance exam payment queue: staff open an applicant's proof of
/// payment and verify or reject it. Support Staff verify payments; Admin can
/// do everything Support Staff can.
/// </summary>
[Authorize(Roles = "SupportStaff,Admin")]
[ApiController]
[Route("api/staff/payments")]
public class StaffPaymentsController : ControllerBase
{
    private readonly IExamPaymentService _paymentService;

    public StaffPaymentsController(IExamPaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    /// <summary>Payments with proof uploaded, Pending first. Filter with ?status=Pending|Verified|Rejected.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ExamPaymentQueueItemResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<ExamPaymentQueueItemResponse>>> List([FromQuery] string? status, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _paymentService.ListAsync(string.IsNullOrWhiteSpace(status) ? null : status, cancellationToken));
        }
        catch (ExamPaymentException ex)
        {
            return Problem(ex.Message, title: "Invalid filter", statusCode: StatusCodes.Status400BadRequest);
        }
    }

    /// <summary>The proof of payment file, served inline for preview.</summary>
    [HttpGet("{paymentId:guid}/proof")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProof(Guid paymentId, CancellationToken cancellationToken)
    {
        var file = await _paymentService.GetProofFileAsync(paymentId, cancellationToken);
        return file is null ? NotFound() : ExamPaymentController.ServeInline(this, file);
    }

    /// <summary>Verifies a Pending payment, optionally recording the sales invoice (SI) number.</summary>
    [HttpPost("{paymentId:guid}/verify")]
    [ProducesResponseType(typeof(ExamPaymentQueueItemResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ExamPaymentQueueItemResponse>> Verify(
        Guid paymentId, [FromBody] VerifyExamPaymentRequest request, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _paymentService.VerifyAsync(paymentId, User.GetUserId(), request.InvoiceNumber, cancellationToken));
        }
        catch (ExamPaymentNotFoundException ex)
        {
            return Problem(ex.Message, title: "Payment not found", statusCode: StatusCodes.Status404NotFound);
        }
        catch (ExamPaymentException ex)
        {
            return Problem(ex.Message, title: "Payment not verified", statusCode: StatusCodes.Status400BadRequest);
        }
    }

    /// <summary>Sets or corrects the sales invoice (SI) number of a verified payment.</summary>
    [HttpPatch("{paymentId:guid}/invoice")]
    [ProducesResponseType(typeof(ExamPaymentQueueItemResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ExamPaymentQueueItemResponse>> SetInvoice(
        Guid paymentId, [FromBody] SetPaymentInvoiceRequest request, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _paymentService.SetInvoiceAsync(paymentId, request.InvoiceNumber!, cancellationToken));
        }
        catch (ExamPaymentNotFoundException ex)
        {
            return Problem(ex.Message, title: "Payment not found", statusCode: StatusCodes.Status404NotFound);
        }
        catch (ExamPaymentException ex)
        {
            return Problem(ex.Message, title: "Invoice not saved", statusCode: StatusCodes.Status400BadRequest);
        }
    }

    /// <summary>Rejects a Pending payment with a reason the applicant will see; they can upload new proof.</summary>
    [HttpPost("{paymentId:guid}/reject")]
    [ProducesResponseType(typeof(ExamPaymentQueueItemResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ExamPaymentQueueItemResponse>> Reject(
        Guid paymentId, [FromBody] RejectExamPaymentRequest request, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _paymentService.RejectAsync(paymentId, User.GetUserId(), request.Reason!, cancellationToken));
        }
        catch (ExamPaymentNotFoundException ex)
        {
            return Problem(ex.Message, title: "Payment not found", statusCode: StatusCodes.Status404NotFound);
        }
        catch (ExamPaymentException ex)
        {
            return Problem(ex.Message, title: "Payment not rejected", statusCode: StatusCodes.Status400BadRequest);
        }
    }
}
