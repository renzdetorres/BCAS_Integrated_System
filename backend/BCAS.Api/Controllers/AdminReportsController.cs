using BCAS.Api.Exceptions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>Admin-Registrar reporting suite (BISAASS-37).</summary>
[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin/reports")]
public class AdminReportsController : ControllerBase
{
    private const string XlsxContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private readonly IAdminReportsService _reportsService;

    public AdminReportsController(IAdminReportsService reportsService)
    {
        _reportsService = reportsService;
    }

    /// <summary>Admission Report: Enrollment List - enrolled (Approved + reserved) admission applicants.</summary>
    [HttpGet("admission/enrollment-list")]
    [ProducesResponseType(typeof(IReadOnlyList<EnrollmentListItemResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<EnrollmentListItemResponse>>> GetEnrollmentList(
        [FromQuery] string? program, [FromQuery] string? applicationType, CancellationToken cancellationToken)
    {
        var items = await _reportsService.GetEnrollmentListAsync(program, applicationType, cancellationToken);
        return Ok(items);
    }

    /// <summary>Admission Report: Enrollment List, exported as an .xlsx workbook.</summary>
    [HttpGet("admission/enrollment-list/export")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ExportEnrollmentList(
        [FromQuery] string? program, [FromQuery] string? applicationType, CancellationToken cancellationToken)
    {
        var file = await _reportsService.ExportEnrollmentListAsync(program, applicationType, cancellationToken);
        return File(file, XlsxContentType, "enrollment-list.xlsx");
    }

    /// <summary>Admission Report: Summary of Enrollment - counts by program and by application type.</summary>
    [HttpGet("admission/enrollment-summary")]
    [ProducesResponseType(typeof(EnrollmentSummaryResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<EnrollmentSummaryResponse>> GetEnrollmentSummary(CancellationToken cancellationToken)
    {
        var summary = await _reportsService.GetEnrollmentSummaryAsync(cancellationToken);
        return Ok(summary);
    }

    /// <summary>Admission Report: Summary of Enrollment, exported as an .xlsx workbook.</summary>
    [HttpGet("admission/enrollment-summary/export")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ExportEnrollmentSummary(CancellationToken cancellationToken)
    {
        var file = await _reportsService.ExportEnrollmentSummaryAsync(cancellationToken);
        return File(file, XlsxContentType, "enrollment-summary.xlsx");
    }

    /// <summary>Admission Report: File per Section - enrolled applicants grouped by their applied-for course.</summary>
    [HttpGet("admission/section-files")]
    [ProducesResponseType(typeof(IReadOnlyList<SectionFileResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SectionFileResponse>>> GetSectionFiles(CancellationToken cancellationToken)
    {
        var sections = await _reportsService.GetSectionFilesAsync(cancellationToken);
        return Ok(sections);
    }

    /// <summary>Admission Report: File per Section, exported as an .xlsx workbook.</summary>
    [HttpGet("admission/section-files/export")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ExportSectionFiles(CancellationToken cancellationToken)
    {
        var file = await _reportsService.ExportSectionFilesAsync(cancellationToken);
        return File(file, XlsxContentType, "file-per-section.xlsx");
    }

    /// <summary>Scholarship Report: Scholarship Applicant List - every scholarship application, any status.</summary>
    [HttpGet("scholarship/applicant-list")]
    [ProducesResponseType(typeof(IReadOnlyList<ScholarshipApplicantListItemResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ScholarshipApplicantListItemResponse>>> GetScholarshipApplicantList(
        [FromQuery] string? scholarshipName, [FromQuery] string? status, CancellationToken cancellationToken)
    {
        var items = await _reportsService.GetScholarshipApplicantListAsync(scholarshipName, status, cancellationToken);
        return Ok(items);
    }

    /// <summary>Scholarship Report: Qualified/Not Qualified Applicants - eligibility screening verdicts.</summary>
    [HttpGet("scholarship/qualification")]
    [ProducesResponseType(typeof(IReadOnlyList<ScholarshipQualificationListItemResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ScholarshipQualificationListItemResponse>>> GetScholarshipQualificationList(
        [FromQuery] string? verdict, CancellationToken cancellationToken)
    {
        var items = await _reportsService.GetScholarshipQualificationListAsync(verdict, cancellationToken);
        return Ok(items);
    }

    /// <summary>Scholarship Report: Scholarship Results - applications with a final Approved/Rejected outcome.</summary>
    [HttpGet("scholarship/results")]
    [ProducesResponseType(typeof(IReadOnlyList<ScholarshipResultListItemResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ScholarshipResultListItemResponse>>> GetScholarshipResultList(
        [FromQuery] string? decision, CancellationToken cancellationToken)
    {
        var items = await _reportsService.GetScholarshipResultListAsync(decision, cancellationToken);
        return Ok(items);
    }

    /// <summary>Scholarship Report: Scholarship Slot Report - every scholarship with its total/remaining/occupied slot counts.</summary>
    [HttpGet("scholarship/slots")]
    [ProducesResponseType(typeof(IReadOnlyList<AdminScholarshipResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AdminScholarshipResponse>>> GetScholarshipSlotReport(CancellationToken cancellationToken)
    {
        var slots = await _reportsService.GetScholarshipSlotReportAsync(cancellationToken);
        return Ok(slots);
    }

    /// <summary>
    /// A printable scholarship record/contract for one Approved scholarship
    /// application. The frontend renders this as a print-ready page.
    /// </summary>
    [HttpGet("scholarship/{applicationId:guid}/contract")]
    [ProducesResponseType(typeof(ScholarshipContractResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ScholarshipContractResponse>> GetScholarshipContract(
        Guid applicationId, CancellationToken cancellationToken)
    {
        try
        {
            var contract = await _reportsService.GetScholarshipContractAsync(applicationId, cancellationToken);
            return Ok(contract);
        }
        catch (ScholarshipContractNotAvailableException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Contract not available",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
    }
}
