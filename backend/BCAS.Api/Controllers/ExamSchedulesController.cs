using BCAS.Api.Exceptions;
using BCAS.Api.Extensions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

[Authorize(Roles = "Applicant")]
[ApiController]
[Route("api/exam-schedules")]
public class ExamSchedulesController : ControllerBase
{
    private readonly IExamScheduleService _examScheduleService;

    public ExamSchedulesController(IExamScheduleService examScheduleService)
    {
        _examScheduleService = examScheduleService;
    }

    /// <summary>
    /// Selectable entrance-exam schedules: Saturday slots are always
    /// included, Weekday slots only when currently offered.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ExamScheduleResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ExamScheduleResponse>>> GetAvailable(CancellationToken cancellationToken)
    {
        var schedules = await _examScheduleService.GetAvailableAsync(cancellationToken);
        return Ok(schedules);
    }

    /// <summary>The signed-in applicant's confirmed exam schedule, if one has been selected.</summary>
    [HttpGet("selection")]
    [ProducesResponseType(typeof(ExamScheduleSelectionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ExamScheduleSelectionResponse>> GetMySelection(CancellationToken cancellationToken)
    {
        var selection = await _examScheduleService.GetMySelectionAsync(User.GetUserId(), cancellationToken);
        return selection is null ? NotFound() : Ok(selection);
    }

    /// <summary>
    /// Selects (or changes) the signed-in applicant's entrance-exam
    /// schedule. Weekday slots that aren't currently offered are rejected.
    /// </summary>
    [HttpPut("selection")]
    [ProducesResponseType(typeof(ExamScheduleSelectionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ExamScheduleSelectionResponse>> Select(
        [FromBody] SelectExamScheduleRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var selection = await _examScheduleService.SelectAsync(User.GetUserId(), request, cancellationToken);
            return Ok(selection);
        }
        catch (ExamScheduleNotFoundException ex)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Exam schedule not found",
                Detail = ex.Message,
                Status = StatusCodes.Status404NotFound,
            });
        }
        catch (ExamScheduleNotAvailableException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Exam schedule not available",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
    }
}
