using BCAS.Api.Exceptions;
using BCAS.Api.Extensions;
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
    private readonly IAuditLogService _auditLogService;

    public AdminExamSchedulesController(IAdminExamScheduleService examScheduleService, IAuditLogService auditLogService)
    {
        _examScheduleService = examScheduleService;
        _auditLogService = auditLogService;
    }

    /// <summary>Admin-only: every exam schedule (offered or not), each with the applicants assigned to it.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AdminExamScheduleResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AdminExamScheduleResponse>>> GetAll(CancellationToken cancellationToken)
    {
        var schedules = await _examScheduleService.GetAllAsync(cancellationToken);
        return Ok(schedules);
    }

    private ObjectResult Conflict(ExamScheduleConflictException ex) =>
        StatusCode(StatusCodes.Status409Conflict, new ProblemDetails
        {
            Title = "Exam schedule not changed",
            Detail = ex.Message,
            Status = StatusCodes.Status409Conflict,
        });

    private ObjectResult NotFound(ExamScheduleNotFoundException ex) =>
        StatusCode(StatusCodes.Status404NotFound, new ProblemDetails
        {
            Title = "Exam schedule not found",
            Detail = ex.Message,
            Status = StatusCodes.Status404NotFound,
        });

    /// <summary>Admin-only: adds a time slot to a date. Philippine time; the day type follows the date.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(ExamScheduleResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ExamScheduleResponse>> Create(
        [FromBody] CreateExamScheduleRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var schedule = await _examScheduleService.CreateAsync(request, cancellationToken);
            await _auditLogService.LogAsync(
                User, "ExamScheduleCreated", $"{schedule.ExamDate} {schedule.ExamTime}", cancellationToken);
            return CreatedAtAction(nameof(GetAll), new { id = schedule.ExamScheduleId }, schedule);
        }
        catch (ExamScheduleConflictException ex)
        {
            return Conflict(ex);
        }
    }

    /// <summary>Admin-only: changes a slot's time and seats. Applicants booked on a moved slot are emailed the new time.</summary>
    [HttpPut("{examScheduleId:int}")]
    [ProducesResponseType(typeof(ExamScheduleResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ExamScheduleResponse>> Update(
        int examScheduleId,
        [FromBody] UpdateExamScheduleRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var schedule = await _examScheduleService.UpdateAsync(examScheduleId, request, cancellationToken);
            await _auditLogService.LogAsync(
                User, "ExamScheduleUpdated", $"{schedule.ExamDate} {schedule.ExamTime}: {(schedule.Capacity?.ToString() ?? "no limit")} seats", cancellationToken);
            return Ok(schedule);
        }
        catch (ExamScheduleNotFoundException ex)
        {
            return NotFound(ex);
        }
        catch (ExamScheduleConflictException ex)
        {
            return Conflict(ex);
        }
    }

    /// <summary>Admin-only: removes a slot nobody has booked.</summary>
    [HttpDelete("{examScheduleId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(int examScheduleId, CancellationToken cancellationToken)
    {
        try
        {
            await _examScheduleService.DeleteAsync(examScheduleId, cancellationToken);
            await _auditLogService.LogAsync(User, "ExamScheduleDeleted", $"Slot {examScheduleId}", cancellationToken);
            return NoContent();
        }
        catch (ExamScheduleNotFoundException ex)
        {
            return NotFound(ex);
        }
        catch (ExamScheduleConflictException ex)
        {
            return Conflict(ex);
        }
    }

    /// <summary>Admin-only: offers or withdraws every slot on a date at once. Applicants already booked keep their slot.</summary>
    [HttpPatch("dates/{examDate}/offered")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> SetDateOffered(
        DateOnly examDate,
        [FromBody] SetExamDateOfferedRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            await _examScheduleService.SetDateOfferedAsync(examDate, request.IsOffered!.Value, cancellationToken);
            await _auditLogService.LogAsync(
                User, request.IsOffered.Value ? "ExamScheduleOffered" : "ExamScheduleUnoffered", $"{examDate:yyyy-MM-dd}", cancellationToken);
            return NoContent();
        }
        catch (ExamScheduleConflictException ex)
        {
            return Conflict(ex);
        }
    }

    /// <summary>
    /// Admin-only: what happened to a scheduled applicant (Scheduled,
    /// ExamDone, Rescheduled, DidNotTakeExam). Moves their admission
    /// application with it where the workflow allows.
    /// </summary>
    [HttpPatch("applicants/{userId:guid}/status")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SetApplicantExamStatus(
        Guid userId,
        [FromBody] SetExamStatusRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            await _examScheduleService.SetApplicantExamStatusAsync(userId, request.Status!, User.GetUserId(), cancellationToken);
            await _auditLogService.LogAsync(User, "ExamScheduleStatusUpdated", $"{request.Status} for applicant {userId}", cancellationToken);
            return NoContent();
        }
        catch (Exception ex) when (ex is InvalidExamStatusException or NoExamScheduleSelectedException or InvalidStatusTransitionException or StatusPreconditionNotMetException)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Could not update the exam status",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
    }

    /// <summary>Admin-only: sets how many applicants a slot holds (blank = no limit).</summary>
    [HttpPatch("{examScheduleId:int}/capacity")]
    [ProducesResponseType(typeof(ExamScheduleResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ExamScheduleResponse>> SetCapacity(
        int examScheduleId,
        [FromBody] SetExamScheduleCapacityRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var schedule = await _examScheduleService.SetCapacityAsync(examScheduleId, request.Capacity, cancellationToken);
            await _auditLogService.LogAsync(
                User, "ExamScheduleCapacityChanged", $"{schedule.DayType} {schedule.ExamDate} {schedule.ExamTime}: {(request.Capacity?.ToString() ?? "no limit")} seats", cancellationToken);
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

    /// <summary>
    /// Admin-only: offers or withdraws one time slot. A withdrawn slot can no
    /// longer be booked; applicants who already booked it keep it.
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
            await _auditLogService.LogAsync(
                User,
                request.IsOffered.Value ? "ExamScheduleOffered" : "ExamScheduleUnoffered",
                $"{schedule.DayType} {schedule.ExamDate} {schedule.ExamTime}",
                cancellationToken);
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
