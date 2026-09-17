using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>
/// Evaluator-only, read-only view of scholarship slot counts (BISAASS-45).
/// No create/update/deactivate endpoints exist here by design - slot
/// management stays wherever an Admin-facing catalog endpoint eventually
/// lands.
/// </summary>
[Authorize(Roles = "Evaluator")]
[ApiController]
[Route("api/evaluator/scholarship-slots")]
public class EvaluatorScholarshipSlotsController : ControllerBase
{
    private readonly IEvaluatorScholarshipSlotsService _slotsService;

    public EvaluatorScholarshipSlotsController(IEvaluatorScholarshipSlotsService slotsService)
    {
        _slotsService = slotsService;
    }

    /// <summary>Evaluator-only: available/occupied slot counts for every scholarship.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<EvaluatorScholarshipSlotsResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<EvaluatorScholarshipSlotsResponse>>> GetSlots(CancellationToken cancellationToken)
    {
        var slots = await _slotsService.GetSlotsAsync(cancellationToken);
        return Ok(slots);
    }
}
