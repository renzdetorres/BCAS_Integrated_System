using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

[Authorize(Roles = "Applicant")]
[ApiController]
[Route("api/announcements")]
public class AnnouncementsController : ControllerBase
{
    private readonly IAnnouncementService _announcementService;

    public AnnouncementsController(IAnnouncementService announcementService)
    {
        _announcementService = announcementService;
    }

    /// <summary>Currently-active Admission/Scholarship announcements, most recently posted first.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AnnouncementResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AnnouncementResponse>>> GetActive(CancellationToken cancellationToken)
    {
        var announcements = await _announcementService.GetActiveAsync(cancellationToken);
        return Ok(announcements);
    }
}
