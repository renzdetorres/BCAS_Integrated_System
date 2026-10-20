using BCAS.Api.Exceptions;
using BCAS.Api.Extensions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>
/// Support Staff/Admin-Registrar: the staff side of the two-way inquiry
/// feature (see InquiriesController for the applicant's side) - a queue of
/// every applicant's inquiry thread, filterable by status, with reply and
/// close/reopen actions.
/// </summary>
[Authorize(Roles = "SupportStaff,Admin")]
[ApiController]
[Route("api/staff/inquiries")]
public class StaffInquiriesController : ControllerBase
{
    private readonly IStaffInquiryService _inquiryService;

    public StaffInquiriesController(IStaffInquiryService inquiryService)
    {
        _inquiryService = inquiryService;
    }

    /// <summary>Every applicant's inquiry thread, most recent activity first, optionally narrowed by status ('Open' or 'Closed').</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<InquiryThreadSummaryResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<InquiryThreadSummaryResponse>>> GetQueue(
        [FromQuery] string? status, CancellationToken cancellationToken)
    {
        var threads = await _inquiryService.GetQueueAsync(status, cancellationToken);
        return Ok(threads);
    }

    /// <summary>One thread's full message history.</summary>
    [HttpGet("{threadId:guid}")]
    [ProducesResponseType(typeof(InquiryThreadDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<InquiryThreadDetailResponse>> GetThreadDetail(Guid threadId, CancellationToken cancellationToken)
    {
        try
        {
            var thread = await _inquiryService.GetThreadDetailAsync(threadId, cancellationToken);
            return Ok(thread);
        }
        catch (InquiryThreadNotFoundException ex)
        {
            return NotFound(new ProblemDetails { Title = "Thread not found", Detail = ex.Message, Status = StatusCodes.Status404NotFound });
        }
    }

    /// <summary>Replies on a thread and emails the applicant.</summary>
    [HttpPost("{threadId:guid}/messages")]
    [ProducesResponseType(typeof(InquiryThreadDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<InquiryThreadDetailResponse>> PostMessage(
        Guid threadId, [FromBody] PostInquiryMessageRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var thread = await _inquiryService.PostMessageAsync(User.GetUserId(), threadId, request, cancellationToken);
            return Ok(thread);
        }
        catch (InquiryThreadNotFoundException ex)
        {
            return NotFound(new ProblemDetails { Title = "Thread not found", Detail = ex.Message, Status = StatusCodes.Status404NotFound });
        }
    }

    /// <summary>Marks a thread resolved.</summary>
    [HttpPost("{threadId:guid}/close")]
    [ProducesResponseType(typeof(InquiryThreadSummaryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<InquiryThreadSummaryResponse>> Close(Guid threadId, CancellationToken cancellationToken)
    {
        try
        {
            var thread = await _inquiryService.CloseAsync(threadId, cancellationToken);
            return Ok(thread);
        }
        catch (InquiryThreadNotFoundException ex)
        {
            return NotFound(new ProblemDetails { Title = "Thread not found", Detail = ex.Message, Status = StatusCodes.Status404NotFound });
        }
    }

    /// <summary>Reopens a closed thread.</summary>
    [HttpPost("{threadId:guid}/reopen")]
    [ProducesResponseType(typeof(InquiryThreadSummaryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<InquiryThreadSummaryResponse>> Reopen(Guid threadId, CancellationToken cancellationToken)
    {
        try
        {
            var thread = await _inquiryService.ReopenAsync(threadId, cancellationToken);
            return Ok(thread);
        }
        catch (InquiryThreadNotFoundException ex)
        {
            return NotFound(new ProblemDetails { Title = "Thread not found", Detail = ex.Message, Status = StatusCodes.Status404NotFound });
        }
    }
}
