using BCAS.Api.Extensions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

[Authorize(Roles = "Applicant")]
[ApiController]
[Route("api/applications")]
public class ApplicationHistoryController : ControllerBase
{
    private readonly IApplicationHistoryService _historyService;

    public ApplicationHistoryController(IApplicationHistoryService historyService)
    {
        _historyService = historyService;
    }

    /// <summary>
    /// Lists the signed-in applicant's full application history - both
    /// admission and scholarship applications together, most recent first.
    /// Each item already carries its full type-specific detail, so the
    /// frontend needs no follow-up call to show a selected application.
    /// </summary>
    [HttpGet("history")]
    [ProducesResponseType(typeof(IReadOnlyList<ApplicationHistoryItemResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ApplicationHistoryItemResponse>>> GetMyHistory(CancellationToken cancellationToken)
    {
        var history = await _historyService.GetMyHistoryAsync(User.GetUserId(), cancellationToken);
        return Ok(history);
    }
}
