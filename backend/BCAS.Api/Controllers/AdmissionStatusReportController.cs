using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>Admission results and applicant status report, filterable by date, academic year, level and program.</summary>
[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin/reports/admission/applicant-status")]
public class AdmissionStatusReportController : ControllerBase
{
    private readonly IAdmissionStatusReportService _service;

    public AdmissionStatusReportController(IAdmissionStatusReportService service)
    {
        _service = service;
    }

    [HttpGet]
    [ProducesResponseType(typeof(AdmissionStatusReportResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AdmissionStatusReportResponse>> Get(
        [FromQuery] DateOnly? dateFrom,
        [FromQuery] DateOnly? dateTo,
        [FromQuery] string? academicYear,
        [FromQuery] string? department,
        [FromQuery] string? yearLevel,
        [FromQuery] string? program,
        CancellationToken cancellationToken) =>
        Ok(await _service.GetAsync(
            new AdmissionStatusReportFilter
            {
                DateFrom = dateFrom,
                DateTo = dateTo,
                AcademicYear = academicYear,
                Department = department,
                YearLevel = yearLevel,
                Program = program,
            },
            cancellationToken));
}
