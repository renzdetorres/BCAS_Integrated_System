using BCAS.Api.Exceptions;
using BCAS.Api.Extensions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>Staff side of exam results. Admins, Evaluators and Support Staff enter raw scores; the result follows from the score.</summary>
[Authorize(Roles = "Admin,Evaluator,SupportStaff")]
[ApiController]
[Route("api/staff/exam-results")]
public class StaffExamResultsController : ControllerBase
{
    private readonly IExamResultService _service;

    public StaffExamResultsController(IExamResultService service)
    {
        _service = service;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ExamResultQueueItem>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ExamResultQueueItem>>> GetQueue(CancellationToken cancellationToken) =>
        Ok(await _service.GetQueueAsync(cancellationToken));

    /// <summary>The passing score and retake limit a raw score is measured against.</summary>
    [HttpGet("rules")]
    [ProducesResponseType(typeof(ExamScoringRulesResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<ExamScoringRulesResponse>> GetRules(CancellationToken cancellationToken) =>
        Ok(await _service.GetRulesAsync(cancellationToken));

    /// <summary>Records the raw score of an applicant who has taken the exam, works out Passed, Retake or Failed, and moves the application on.</summary>
    [HttpPost("{applicationId:guid}")]
    [ProducesResponseType(typeof(ExamResultQueueItem), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ExamResultQueueItem>> Record(Guid applicationId, [FromBody] RecordExamResultRequest request, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.RecordAsync(applicationId, request, User.GetUserId(), cancellationToken));
        }
        catch (ApplicationNotFoundException ex)
        {
            return Problem(ex.Message, title: "Application not found", statusCode: StatusCodes.Status404NotFound);
        }
        catch (Exception ex) when (ex is AdmissionStepException or InvalidStatusTransitionException or StatusPreconditionNotMetException)
        {
            return Problem(ex.Message, title: "Result not recorded", statusCode: StatusCodes.Status400BadRequest);
        }
    }
}

/// <summary>Staff side of interviews and the admission result they decide.</summary>
[Authorize(Roles = "Admin,Evaluator")]
[ApiController]
[Route("api/staff/interviews")]
public class StaffInterviewsController : ControllerBase
{
    private readonly IInterviewService _service;

    public StaffInterviewsController(IInterviewService service)
    {
        _service = service;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<InterviewQueueItemResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<InterviewQueueItemResponse>>> GetQueue(CancellationToken cancellationToken) =>
        Ok(await _service.GetQueueAsync(cancellationToken));

    [HttpPut("{applicationId:guid}")]
    [ProducesResponseType(typeof(InterviewQueueItemResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<InterviewQueueItemResponse>> Schedule(Guid applicationId, [FromBody] ScheduleInterviewRequest request, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.ScheduleAsync(applicationId, request, User.GetUserId(), cancellationToken));
        }
        catch (ApplicationNotFoundException ex)
        {
            return Problem(ex.Message, title: "Application not found", statusCode: StatusCodes.Status404NotFound);
        }
        catch (AdmissionStepException ex)
        {
            return Problem(ex.Message, title: "Interview not scheduled", statusCode: StatusCodes.Status400BadRequest);
        }
    }

    [HttpPost("{applicationId:guid}/evaluate")]
    [ProducesResponseType(typeof(InterviewQueueItemResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<InterviewQueueItemResponse>> Evaluate(Guid applicationId, [FromBody] EvaluateInterviewRequest request, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.EvaluateAsync(applicationId, request, User.GetUserId(), cancellationToken));
        }
        catch (ApplicationNotFoundException ex)
        {
            return Problem(ex.Message, title: "Application not found", statusCode: StatusCodes.Status404NotFound);
        }
        catch (Exception ex) when (ex is AdmissionStepException or InvalidStatusTransitionException or StatusPreconditionNotMetException)
        {
            return Problem(ex.Message, title: "Result not recorded", statusCode: StatusCodes.Status400BadRequest);
        }
    }
}

/// <summary>The applicant's own exam result.</summary>
[Authorize(Roles = "Applicant")]
[ApiController]
[Route("api/exam-result")]
public class ExamResultController : ControllerBase
{
    private readonly IExamResultService _service;

    public ExamResultController(IExamResultService service)
    {
        _service = service;
    }

    [HttpGet]
    [ProducesResponseType(typeof(MyExamResultResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<MyExamResultResponse>> Get(CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.GetMyResultAsync(User.GetUserId(), cancellationToken));
        }
        catch (NoAdmissionApplicationException ex)
        {
            return Problem(ex.Message, title: "No admission application", statusCode: StatusCodes.Status400BadRequest);
        }
    }
}

/// <summary>The applicant's own interview schedule and admission outcome.</summary>
[Authorize(Roles = "Applicant")]
[ApiController]
[Route("api/interview")]
public class InterviewController : ControllerBase
{
    private readonly IInterviewService _service;

    public InterviewController(IInterviewService service)
    {
        _service = service;
    }

    [HttpGet]
    [ProducesResponseType(typeof(MyInterviewResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<MyInterviewResponse>> Get(CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _service.GetMyInterviewAsync(User.GetUserId(), cancellationToken));
        }
        catch (NoAdmissionApplicationException ex)
        {
            return Problem(ex.Message, title: "No admission application", statusCode: StatusCodes.Status400BadRequest);
        }
    }
}
