using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

[Authorize(Roles = "Evaluator")]
[ApiController]
[Route("api/evaluator/dashboard")]
public class EvaluatorDashboardController : ControllerBase
{
    private readonly IEvaluatorDashboardService _dashboardService;

    public EvaluatorDashboardController(IEvaluatorDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    /// <summary>
    /// Evaluator-only: the scholarship application queue awaiting evaluation,
    /// the pending-evaluations count, and the most recently evaluated
    /// applications.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(EvaluatorDashboardResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<EvaluatorDashboardResponse>> GetDashboard(CancellationToken cancellationToken)
    {
        var dashboard = await _dashboardService.GetDashboardAsync(cancellationToken);
        return Ok(dashboard);
    }
}
