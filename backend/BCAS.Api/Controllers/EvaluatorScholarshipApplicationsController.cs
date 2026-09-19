using BCAS.Api.Exceptions;
using BCAS.Api.Extensions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

[Authorize(Roles = "Evaluator")]
[ApiController]
[Route("api/evaluator/scholarship-applications")]
public class EvaluatorScholarshipApplicationsController : ControllerBase
{
    private readonly IEvaluatorScholarshipApplicationService _applicationService;

    public EvaluatorScholarshipApplicationsController(IEvaluatorScholarshipApplicationService applicationService)
    {
        _applicationService = applicationService;
    }

    /// <summary>
    /// Evaluator-only: full detail for one scholarship application, including
    /// the applicant's academic information (grade average, BCASian status)
    /// checked against the scholarship's requirements, and any existing
    /// screening verdict.
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
            var detail = await _applicationService.GetDetailAsync(applicationId, cancellationToken);
            return Ok(detail);
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
    /// Evaluator-only: records (or replaces) the Qualified/Not Qualified
    /// screening verdict for an application, with optional remarks.
    /// </summary>
    [HttpPut("{applicationId:guid}/screening")]
    [ProducesResponseType(typeof(EvaluatorScholarshipApplicationDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EvaluatorScholarshipApplicationDetailResponse>> RecordScreening(
        Guid applicationId,
        [FromBody] RecordScholarshipScreeningRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var detail = await _applicationService.RecordScreeningAsync(
                applicationId, User.GetUserId(), request, cancellationToken);
            return Ok(detail);
        }
        catch (InvalidScreeningVerdictException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid verdict",
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

    /// <summary>
    /// Evaluator-only: moves an application forward one step in the
    /// Submitted -> Documents Verified -> Eligibility Screening ->
    /// Evaluation -> Result workflow.
    /// </summary>
    [HttpPost("{applicationId:guid}/advance")]
    [ProducesResponseType(typeof(EvaluatorScholarshipApplicationDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EvaluatorScholarshipApplicationDetailResponse>> AdvanceWorkflow(
        Guid applicationId,
        CancellationToken cancellationToken)
    {
        try
        {
            var detail = await _applicationService.AdvanceWorkflowAsync(applicationId, User.GetUserId(), cancellationToken);
            return Ok(detail);
        }
        catch (ScholarshipWorkflowCannotAdvanceException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Cannot advance workflow",
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
}
