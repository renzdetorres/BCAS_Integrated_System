using BCAS.Api.Exceptions;
using BCAS.Api.Extensions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>
/// Academic Head-only (BISAASS-47). Shares the Evaluator's scholarship
/// application review (IEvaluatorScholarshipApplicationService - same
/// academic records, submitted documents, and evaluation results an
/// Evaluator sees) but adds the elevated authority to confirm the final
/// Approved/Rejected decision, which an Evaluator cannot do. Everything
/// here is scoped to the caller's assigned department: the queue lists
/// only their department's applicants, and another department's
/// application answers 404 on detail and decision alike.
/// </summary>
[Authorize(Roles = "AcademicHead")]
[ApiController]
[Route("api/academic-head/scholarship-applications")]
public class AcademicHeadScholarshipApplicationsController : ControllerBase
{
    private const int ReadyForDecisionCount = 20;

    private readonly IEvaluatorScholarshipApplicationService _applicationService;
    private readonly IAcademicHeadScopeService _scopeService;

    public AcademicHeadScholarshipApplicationsController(
        IEvaluatorScholarshipApplicationService applicationService,
        IAcademicHeadScopeService scopeService)
    {
        _applicationService = applicationService;
        _scopeService = scopeService;
    }

    /// <summary>Academic Head-only: applications in the caller's department that have reached "Result" and are awaiting a final decision.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<EvaluatorQueueApplicationResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<IReadOnlyList<EvaluatorQueueApplicationResponse>>> GetReadyForDecision(CancellationToken cancellationToken)
    {
        try
        {
            var department = await _scopeService.GetAssignedDepartmentAsync(User.GetUserId(), cancellationToken);
            var applications = await _applicationService.GetReadyForDecisionAsync(ReadyForDecisionCount, department, cancellationToken);
            return Ok(applications);
        }
        catch (AcademicHeadDepartmentNotAssignedException ex)
        {
            return DepartmentNotAssigned(ex);
        }
    }

    /// <summary>
    /// Academic Head-only: full detail for one scholarship application -
    /// academic records, submitted documents, eligibility rules, and the
    /// Evaluator's screening result - to review before confirming a
    /// decision.
    /// </summary>
    [HttpGet("{applicationId:guid}")]
    [ProducesResponseType(typeof(EvaluatorScholarshipApplicationDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EvaluatorScholarshipApplicationDetailResponse>> GetDetail(
        Guid applicationId,
        CancellationToken cancellationToken)
    {
        try
        {
            await EnsureInCallersDepartmentAsync(applicationId, cancellationToken);
            var detail = await _applicationService.GetDetailAsync(applicationId, cancellationToken);
            return Ok(detail);
        }
        catch (AcademicHeadDepartmentNotAssignedException ex)
        {
            return DepartmentNotAssigned(ex);
        }
        catch (ScholarshipApplicationNotFoundException ex)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Scholarship application not found",
                Detail = ex.Message,
                Status = StatusCodes.Status404NotFound,
            });
        }
    }

    /// <summary>
    /// Academic Head-only: confirms the final Approved/Rejected decision,
    /// with optional remarks. Only allowed once the application has reached
    /// the "Result" stage of the Evaluator's guided workflow.
    /// </summary>
    [HttpPost("{applicationId:guid}/decision")]
    [ProducesResponseType(typeof(EvaluatorScholarshipApplicationDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EvaluatorScholarshipApplicationDetailResponse>> RecordDecision(
        Guid applicationId,
        [FromBody] RecordScholarshipFinalDecisionRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            await EnsureInCallersDepartmentAsync(applicationId, cancellationToken);
            var detail = await _applicationService.RecordFinalDecisionAsync(
                applicationId, User.GetUserId(), request, cancellationToken);
            return Ok(detail);
        }
        catch (AcademicHeadDepartmentNotAssignedException ex)
        {
            return DepartmentNotAssigned(ex);
        }
        catch (InvalidFinalDecisionException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid decision",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
        catch (ScholarshipApplicationNotReadyForDecisionException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Application not ready for a decision",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
        catch (ScholarshipApplicationNotFoundException ex)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Scholarship application not found",
                Detail = ex.Message,
                Status = StatusCodes.Status404NotFound,
            });
        }
    }

    private async Task EnsureInCallersDepartmentAsync(Guid applicationId, CancellationToken cancellationToken)
    {
        var department = await _scopeService.GetAssignedDepartmentAsync(User.GetUserId(), cancellationToken);
        await _scopeService.EnsureScholarshipApplicationInDepartmentAsync(applicationId, department, cancellationToken);
    }

    private ObjectResult DepartmentNotAssigned(AcademicHeadDepartmentNotAssignedException ex) =>
        StatusCode(StatusCodes.Status400BadRequest, new ProblemDetails
        {
            Title = "No department assigned",
            Detail = ex.Message,
            Status = StatusCodes.Status400BadRequest,
        });
}
