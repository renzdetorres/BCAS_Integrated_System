using BCAS.Api.Exceptions;
using BCAS.Api.Extensions;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>
/// The scholarship exam, the interview / essay and the Top 10 grantees. An
/// Academic Head sees only their own department; Evaluators and Admins record.
/// </summary>
[Authorize(Roles = "Admin,Evaluator,AcademicHead")]
[ApiController]
[Route("api/staff/scholarship-pipeline")]
public class ScholarshipPipelineController : ControllerBase
{
    private readonly IScholarshipPipelineService _service;
    private readonly IAcademicHeadScopeService _scopeService;

    public ScholarshipPipelineController(IScholarshipPipelineService service, IAcademicHeadScopeService scopeService)
    {
        _service = service;
        _scopeService = scopeService;
    }

    [HttpGet("summary")]
    [ProducesResponseType(typeof(ScholarshipSummaryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ScholarshipSummaryResponse>> GetSummary([FromQuery] string? academicYear, CancellationToken cancellationToken)
    {
        var scope = await ResolveDepartmentAsync(cancellationToken);
        if (scope.Error is not null)
        {
            return scope.Error;
        }

        return Ok(await _service.GetSummaryAsync(scope.Department, Clean(academicYear), cancellationToken));
    }

    [HttpGet("applicants")]
    [ProducesResponseType(typeof(IReadOnlyList<ScholarshipApplicantRowResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<ScholarshipApplicantRowResponse>>> GetApplicants(CancellationToken cancellationToken)
    {
        var scope = await ResolveDepartmentAsync(cancellationToken);
        if (scope.Error is not null)
        {
            return scope.Error;
        }

        return Ok(await _service.GetApplicantsAsync(scope.Department, cancellationToken));
    }

    /// <summary>The Top 10 grantees (approved scholars ranked by their combined exam, interview and essay score), filterable by department, level and academic year.</summary>
    [HttpGet("grantees")]
    [ProducesResponseType(typeof(IReadOnlyList<GranteeResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<GranteeResponse>>> GetGrantees(
        [FromQuery] string? department, [FromQuery] string? level, [FromQuery] string? academicYear, CancellationToken cancellationToken)
    {
        var scope = await ResolveDepartmentAsync(cancellationToken);
        if (scope.Error is not null)
        {
            return scope.Error;
        }

        // An Academic Head can't widen their own department.
        var effective = scope.Department ?? Clean(department);
        return Ok(await _service.GetTopGranteesAsync(effective, Clean(level), Clean(academicYear), cancellationToken));
    }

    [Authorize(Roles = "Admin,Evaluator")]
    [HttpPost("{applicationId:guid}/exam-result")]
    [ProducesResponseType(typeof(ScholarshipApplicantRowResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ScholarshipApplicantRowResponse>> RecordExamResult(
        Guid applicationId, [FromBody] RecordScholarshipExamResultRequest request, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.RecordExamResultAsync(applicationId, request, User.GetUserId(), cancellationToken));
        }
        catch (ApplicationNotFoundException ex)
        {
            return Problem(ex.Message, title: "Application not found", statusCode: StatusCodes.Status404NotFound);
        }
        catch (Exception ex) when (ex is AdmissionStepException or InvalidStatusTransitionException)
        {
            return Problem(ex.Message, title: "Result not recorded", statusCode: StatusCodes.Status400BadRequest);
        }
    }

    [Authorize(Roles = "Admin,Evaluator")]
    [HttpPost("{applicationId:guid}/interview")]
    [ProducesResponseType(typeof(ScholarshipApplicantRowResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ScholarshipApplicantRowResponse>> RecordInterview(
        Guid applicationId, [FromBody] RecordScholarshipInterviewRequest request, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.RecordInterviewAsync(applicationId, request, User.GetUserId(), cancellationToken));
        }
        catch (ApplicationNotFoundException ex)
        {
            return Problem(ex.Message, title: "Application not found", statusCode: StatusCodes.Status404NotFound);
        }
        catch (Exception ex) when (ex is AdmissionStepException or InvalidStatusTransitionException)
        {
            return Problem(ex.Message, title: "Scores not recorded", statusCode: StatusCodes.Status400BadRequest);
        }
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private async Task<(string? Department, ActionResult? Error)> ResolveDepartmentAsync(CancellationToken cancellationToken)
    {
        if (!User.IsInRole("AcademicHead"))
        {
            return (null, null);
        }

        try
        {
            return (await _scopeService.GetAssignedDepartmentAsync(User.GetUserId(), cancellationToken), null);
        }
        catch (AcademicHeadDepartmentNotAssignedException ex)
        {
            return (null, Problem(ex.Message, title: "No department assigned", statusCode: StatusCodes.Status400BadRequest));
        }
    }
}
