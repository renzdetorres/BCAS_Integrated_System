using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>
/// Support Staff's Applicant Records screen (BISAASS-51 quick link).
/// Currently a read-only stub - search and per-application detail land
/// with BISAASS-53.
/// </summary>
[Authorize(Roles = "SupportStaff")]
[ApiController]
[Route("api/support-staff/applicants")]
public class SupportStaffApplicantsController : ControllerBase
{
    private readonly ISupportStaffApplicantsService _applicantsService;

    public SupportStaffApplicantsController(ISupportStaffApplicantsService applicantsService)
    {
        _applicantsService = applicantsService;
    }

    /// <summary>Support Staff-only: every Applicant-role account, most recently created first.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<SupportStaffApplicantListItemResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SupportStaffApplicantListItemResponse>>> GetApplicants(CancellationToken cancellationToken)
    {
        var applicants = await _applicantsService.GetApplicantsAsync(cancellationToken);
        return Ok(applicants);
    }
}
