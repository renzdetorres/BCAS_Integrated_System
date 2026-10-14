using BCAS.Api.Exceptions;
using BCAS.Api.Extensions;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>
/// The admission dashboard: how many applicants are in each part of the
/// process, the latest applicants, and five academic years of trend. An
/// Academic Head sees only their own department.
/// </summary>
[Authorize(Roles = "Admin,AcademicHead")]
[ApiController]
[Route("api/admin/admission-summary")]
public class AdmissionSummaryController : ControllerBase
{
    private readonly IAdmissionSummaryService _summaryService;
    private readonly IAcademicHeadScopeService _scopeService;

    public AdmissionSummaryController(IAdmissionSummaryService summaryService, IAcademicHeadScopeService scopeService)
    {
        _summaryService = summaryService;
        _scopeService = scopeService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(AdmissionSummaryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AdmissionSummaryResponse>> Get([FromQuery] string? academicYear, CancellationToken cancellationToken)
    {
        string? department = null;
        if (User.IsInRole("AcademicHead"))
        {
            try
            {
                department = await _scopeService.GetAssignedDepartmentAsync(User.GetUserId(), cancellationToken);
            }
            catch (AcademicHeadDepartmentNotAssignedException ex)
            {
                return Problem(ex.Message, title: "No department assigned", statusCode: StatusCodes.Status400BadRequest);
            }
        }

        return Ok(await _summaryService.GetAsync(department, string.IsNullOrWhiteSpace(academicYear) ? null : academicYear, cancellationToken));
    }
}
