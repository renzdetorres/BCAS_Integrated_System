using BCAS.Api.Exceptions;
using BCAS.Api.Extensions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>
/// Academic Head reporting suite, scoped to the caller's own department
/// (BISAASS-49). The three Admission reports (Enrollment List, Summary of
/// Enrollment, File per Section) are forced-filtered server-side to the
/// caller's Users.Department - no program filter is accepted from the
/// client. The four Scholarship reports match AdminReportsController
/// (BISAASS-37) exactly and are unscoped, since scholarships aren't tied to
/// any department in this system.
/// </summary>
[Authorize(Roles = "AcademicHead")]
[ApiController]
[Route("api/academic-head/reports")]
public class AcademicHeadReportsController : ControllerBase
{
    private const string XlsxContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private readonly IAcademicHeadReportsService _reportsService;

    public AcademicHeadReportsController(IAcademicHeadReportsService reportsService)
    {
        _reportsService = reportsService;
    }

    /// <summary>Admission Report: Enrollment List, scoped to the caller's department.</summary>
    [HttpGet("admission/enrollment-list")]
    [ProducesResponseType(typeof(IReadOnlyList<EnrollmentListItemResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<EnrollmentListItemResponse>>> GetEnrollmentList(
        [FromQuery] string? applicationType, CancellationToken cancellationToken)
    {
        try
        {
            var items = await _reportsService.GetEnrollmentListAsync(User.GetUserId(), applicationType, cancellationToken);
            return Ok(items);
        }
        catch (AcademicHeadDepartmentNotAssignedException ex)
        {
            return DepartmentNotAssigned(ex);
        }
    }

    /// <summary>Admission Report: Enrollment List, scoped to the caller's department, exported as an .xlsx workbook.</summary>
    [HttpGet("admission/enrollment-list/export")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ExportEnrollmentList([FromQuery] string? applicationType, CancellationToken cancellationToken)
    {
        try
        {
            var file = await _reportsService.ExportEnrollmentListAsync(User.GetUserId(), applicationType, cancellationToken);
            return File(file, XlsxContentType, "enrollment-list.xlsx");
        }
        catch (AcademicHeadDepartmentNotAssignedException ex)
        {
            return DepartmentNotAssigned(ex);
        }
    }

    /// <summary>Admission Report: Summary of Enrollment, scoped to the caller's department.</summary>
    [HttpGet("admission/enrollment-summary")]
    [ProducesResponseType(typeof(EnrollmentSummaryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<EnrollmentSummaryResponse>> GetEnrollmentSummary(CancellationToken cancellationToken)
    {
        try
        {
            var summary = await _reportsService.GetEnrollmentSummaryAsync(User.GetUserId(), cancellationToken);
            return Ok(summary);
        }
        catch (AcademicHeadDepartmentNotAssignedException ex)
        {
            return DepartmentNotAssigned(ex);
        }
    }

    /// <summary>Admission Report: Summary of Enrollment, scoped to the caller's department, exported as an .xlsx workbook.</summary>
    [HttpGet("admission/enrollment-summary/export")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ExportEnrollmentSummary(CancellationToken cancellationToken)
    {
        try
        {
            var file = await _reportsService.ExportEnrollmentSummaryAsync(User.GetUserId(), cancellationToken);
            return File(file, XlsxContentType, "enrollment-summary.xlsx");
        }
        catch (AcademicHeadDepartmentNotAssignedException ex)
        {
            return DepartmentNotAssigned(ex);
        }
    }

    /// <summary>Admission Report: File per Section, scoped to the caller's department.</summary>
    [HttpGet("admission/section-files")]
    [ProducesResponseType(typeof(IReadOnlyList<SectionFileResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<SectionFileResponse>>> GetSectionFiles(CancellationToken cancellationToken)
    {
        try
        {
            var sections = await _reportsService.GetSectionFilesAsync(User.GetUserId(), cancellationToken);
            return Ok(sections);
        }
        catch (AcademicHeadDepartmentNotAssignedException ex)
        {
            return DepartmentNotAssigned(ex);
        }
    }

    /// <summary>Admission Report: File per Section, scoped to the caller's department, exported as an .xlsx workbook.</summary>
    [HttpGet("admission/section-files/export")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ExportSectionFiles(CancellationToken cancellationToken)
    {
        try
        {
            var file = await _reportsService.ExportSectionFilesAsync(User.GetUserId(), cancellationToken);
            return File(file, XlsxContentType, "file-per-section.xlsx");
        }
        catch (AcademicHeadDepartmentNotAssignedException ex)
        {
            return DepartmentNotAssigned(ex);
        }
    }

    /// <summary>Scholarship Report: Scholarship Applicant List - unscoped, matches AdminReportsController (BISAASS-37).</summary>
    [HttpGet("scholarship/applicant-list")]
    [ProducesResponseType(typeof(IReadOnlyList<ScholarshipApplicantListItemResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ScholarshipApplicantListItemResponse>>> GetScholarshipApplicantList(
        [FromQuery] string? scholarshipName, [FromQuery] string? status, CancellationToken cancellationToken)
    {
        var items = await _reportsService.GetScholarshipApplicantListAsync(scholarshipName, status, cancellationToken);
        return Ok(items);
    }

    /// <summary>Scholarship Report: Qualified/Not Qualified Applicants - unscoped, matches AdminReportsController (BISAASS-37).</summary>
    [HttpGet("scholarship/qualification")]
    [ProducesResponseType(typeof(IReadOnlyList<ScholarshipQualificationListItemResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ScholarshipQualificationListItemResponse>>> GetScholarshipQualificationList(
        [FromQuery] string? verdict, CancellationToken cancellationToken)
    {
        var items = await _reportsService.GetScholarshipQualificationListAsync(verdict, cancellationToken);
        return Ok(items);
    }

    /// <summary>Scholarship Report: Scholarship Results - unscoped, matches AdminReportsController (BISAASS-37).</summary>
    [HttpGet("scholarship/results")]
    [ProducesResponseType(typeof(IReadOnlyList<ScholarshipResultListItemResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ScholarshipResultListItemResponse>>> GetScholarshipResultList(
        [FromQuery] string? decision, CancellationToken cancellationToken)
    {
        var items = await _reportsService.GetScholarshipResultListAsync(decision, cancellationToken);
        return Ok(items);
    }

    /// <summary>Scholarship Report: Scholarship Slot Report - unscoped, matches AdminReportsController (BISAASS-37).</summary>
    [HttpGet("scholarship/slots")]
    [ProducesResponseType(typeof(IReadOnlyList<AdminScholarshipResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AdminScholarshipResponse>>> GetScholarshipSlotReport(CancellationToken cancellationToken)
    {
        var slots = await _reportsService.GetScholarshipSlotReportAsync(cancellationToken);
        return Ok(slots);
    }

    private ObjectResult DepartmentNotAssigned(AcademicHeadDepartmentNotAssignedException ex) =>
        StatusCode(StatusCodes.Status400BadRequest, new ProblemDetails
        {
            Title = "No department assigned",
            Detail = ex.Message,
            Status = StatusCodes.Status400BadRequest,
        });
}
