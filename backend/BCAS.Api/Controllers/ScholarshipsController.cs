using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

[Authorize(Roles = "Applicant")]
[ApiController]
[Route("api/scholarships")]
public class ScholarshipsController : ControllerBase
{
    private readonly IScholarshipService _scholarshipService;

    public ScholarshipsController(IScholarshipService scholarshipService)
    {
        _scholarshipService = scholarshipService;
    }

    /// <summary>Active scholarship slots with at least one remaining, for applicants to browse.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ScholarshipResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ScholarshipResponse>>> GetAvailable(CancellationToken cancellationToken)
    {
        var scholarships = await _scholarshipService.GetAvailableAsync(cancellationToken);
        return Ok(scholarships);
    }
}
