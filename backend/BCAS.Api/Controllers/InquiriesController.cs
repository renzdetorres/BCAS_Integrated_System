using BCAS.Api.Exceptions;
using BCAS.Api.Extensions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>
/// Applicant-only: the applicant's own side of the two-way inquiry feature
/// - a lightweight ticket/thread per applicant, visible to Support
/// Staff/Admin (see StaffInquiriesController), for asking a follow-up
/// question (e.g. about a flagged document) without calling the office.
/// </summary>
[Authorize(Roles = "Applicant")]
[ApiController]
[Route("api/inquiries")]
public class InquiriesController : ControllerBase
{
    private readonly IApplicantInquiryService _inquiryService;

    public InquiriesController(IApplicantInquiryService inquiryService)
    {
        _inquiryService = inquiryService;
    }

    /// <summary>The caller's own inquiry threads, most recent activity first.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<InquiryThreadSummaryResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<InquiryThreadSummaryResponse>>> GetMyThreads(CancellationToken cancellationToken)
    {
        var threads = await _inquiryService.GetMyThreadsAsync(User.GetUserId(), cancellationToken);
        return Ok(threads);
    }

    /// <summary>One of the caller's own threads with its full message history.</summary>
    [HttpGet("{threadId:guid}")]
    [ProducesResponseType(typeof(InquiryThreadDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<InquiryThreadDetailResponse>> GetMyThreadDetail(Guid threadId, CancellationToken cancellationToken)
    {
        try
        {
            var thread = await _inquiryService.GetMyThreadDetailAsync(User.GetUserId(), threadId, cancellationToken);
            return Ok(thread);
        }
        catch (InquiryThreadNotFoundException ex)
        {
            return NotFound(new ProblemDetails { Title = "Thread not found", Detail = ex.Message, Status = StatusCodes.Status404NotFound });
        }
    }

    /// <summary>Opens a new inquiry thread with its first message.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(InquiryThreadDetailResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<InquiryThreadDetailResponse>> CreateThread(
        [FromBody] CreateInquiryRequest request, CancellationToken cancellationToken)
    {
        var thread = await _inquiryService.CreateThreadAsync(User.GetUserId(), request, cancellationToken);
        return CreatedAtAction(nameof(GetMyThreadDetail), new { threadId = thread.ThreadId }, thread);
    }

    /// <summary>Replies on one of the caller's own threads - reopens it if it was Closed.</summary>
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
}
