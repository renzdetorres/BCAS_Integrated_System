using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>Applicant Records search (BISAASS-53): Support Staff's page, which the Admin holds too.</summary>
[Authorize(Roles = "SupportStaff,Admin")]
[ApiController]
[Route("api/support-staff/applicants")]
public class SupportStaffApplicantsController : ControllerBase
{
    private readonly ISupportStaffApplicantsService _applicantsService;

    public SupportStaffApplicantsController(ISupportStaffApplicantsService applicantsService)
    {
        _applicantsService = applicantsService;
    }

    /// <summary>
    /// Support Staff-only: every Applicant-role account plus their latest
    /// admission application info, most recently created first, optionally
    /// narrowed by search (matches first name, last name, or email).
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<SupportStaffApplicantListItemResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SupportStaffApplicantListItemResponse>>> SearchApplicants(
        [FromQuery] string? search, CancellationToken cancellationToken)
    {
        var applicants = await _applicantsService.SearchApplicantsAsync(search, cancellationToken);
        return Ok(applicants);
    }
}
