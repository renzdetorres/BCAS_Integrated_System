using BCAS.Api.Exceptions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>Admin-Registrar entrance-exam schedule management (BISAASS-29).</summary>
[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin/exam-schedules")]
public class AdminExamSchedulesController : ControllerBase
{
    private readonly IAdminExamScheduleService _examScheduleService;

    public AdminExamSchedulesController(IAdminExamScheduleService examScheduleService)
    {
        _examScheduleService = examScheduleService;
    }

    /// <summary>Admin-only: every exam schedule (offered or not), each with the applicants assigned to it.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AdminExamScheduleResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AdminExamScheduleResponse>>> GetAll(CancellationToken cancellationToken)
    {
        var schedules = await _examScheduleService.GetAllAsync(cancellationToken);
        return Ok(schedules);
    }

    /// <summary>
    /// Admin-only: creates a new Saturday schedule, or a Weekday schedule
    /// (IsOffered reflects whether a teacher is currently available to
    /// assist with it).
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ExamScheduleResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ExamScheduleResponse>> Create(
        [FromBody] CreateExamScheduleRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var schedule = await _examScheduleService.CreateAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetAll), new { id = schedule.ExamScheduleId }, schedule);
        }
        catch (InvalidDayTypeException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid day type",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
    }

    /// <summary>
    /// Admin-only: turns a Weekday schedule's availability on or off based
    /// on whether a teacher can currently assist with it. Has no effect on
    /// Saturday schedules, which are always selectable.
    /// </summary>
    [HttpPatch("{examScheduleId:int}/offered")]
    [ProducesResponseType(typeof(ExamScheduleResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ExamScheduleResponse>> SetOffered(
        int examScheduleId,
        [FromBody] SetExamScheduleOfferedRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var schedule = await _examScheduleService.SetOfferedAsync(examScheduleId, request.IsOffered!.Value, cancellationToken);
            return Ok(schedule);
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
    }
}
