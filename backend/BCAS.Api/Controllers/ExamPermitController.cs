using BCAS.Api.Exceptions;
using BCAS.Api.Extensions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

[Authorize(Roles = "Applicant")]
[ApiController]
[Route("api/exam-permit")]
public class ExamPermitController : ControllerBase
{
    private readonly IExamPermitService _examPermitService;

    public ExamPermitController(IExamPermitService examPermitService)
    {
        _examPermitService = examPermitService;
    }

    /// <summary>The signed-in applicant's exam permit - schedule, venue, and permit number.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(ExamPermitResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ExamPermitResponse>> GetMyPermit(CancellationToken cancellationToken)
    {
        try
        {
            var permit = await _examPermitService.GetMyPermitAsync(User.GetUserId(), cancellationToken);
            return Ok(permit);
        }
        catch (NoExamScheduleSelectedException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "No exam schedule selected",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
        catch (PermitNotReleasedException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Permit not released",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
    }

    /// <summary>The signed-in applicant's most recently submitted reschedule request, if any.</summary>
    [HttpGet("reschedule-request")]
    [ProducesResponseType(typeof(ExamRescheduleRequestResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ExamRescheduleRequestResponse>> GetMyRescheduleRequest(CancellationToken cancellationToken)
    {
        var request = await _examPermitService.GetMyRescheduleRequestAsync(User.GetUserId(), cancellationToken);
        return request is null ? NotFound() : Ok(request);
    }

    /// <summary>
    /// Submits a request to reschedule off the applicant's currently
    /// confirmed exam. Blocked while a previous request is still Pending.
    /// </summary>
    [HttpPost("reschedule-request")]
    [ProducesResponseType(typeof(ExamRescheduleRequestResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ExamRescheduleRequestResponse>> SubmitRescheduleRequest(
        [FromBody] SubmitExamRescheduleRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var response = await _examPermitService.SubmitRescheduleRequestAsync(User.GetUserId(), request, cancellationToken);
            return CreatedAtAction(nameof(GetMyRescheduleRequest), response);
        }
        catch (NoExamScheduleSelectedException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "No exam schedule selected",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
        catch (RescheduleRequestAlreadyPendingException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Reschedule request already pending",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
    }
}
