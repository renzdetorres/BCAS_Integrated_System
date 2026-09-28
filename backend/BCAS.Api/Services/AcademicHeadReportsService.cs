using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class AcademicHeadReportsService : IAcademicHeadReportsService
{
    private readonly IAdminReportsService _reportsService;
    private readonly IAcademicHeadScopeService _scopeService;

    public AcademicHeadReportsService(IAdminReportsService reportsService, IAcademicHeadScopeService scopeService)
    {
        _reportsService = reportsService;
        _scopeService = scopeService;
    }

    public async Task<IReadOnlyList<EnrollmentListItemResponse>> GetEnrollmentListAsync(
        Guid academicHeadUserId, string? applicationType, CancellationToken cancellationToken = default)
    {
        var department = await _scopeService.GetAssignedDepartmentAsync(academicHeadUserId, cancellationToken);
        return await _reportsService.GetEnrollmentListAsync(null, applicationType, department, cancellationToken);
    }

    public async Task<byte[]> ExportEnrollmentListAsync(
        Guid academicHeadUserId, string? applicationType, CancellationToken cancellationToken = default)
    {
        var department = await _scopeService.GetAssignedDepartmentAsync(academicHeadUserId, cancellationToken);
        return await _reportsService.ExportEnrollmentListAsync(null, applicationType, department, cancellationToken);
    }

    public async Task<EnrollmentSummaryResponse> GetEnrollmentSummaryAsync(Guid academicHeadUserId, CancellationToken cancellationToken = default)
    {
        var department = await _scopeService.GetAssignedDepartmentAsync(academicHeadUserId, cancellationToken);
        return await _reportsService.GetEnrollmentSummaryAsync(null, department, cancellationToken);
    }

    public async Task<byte[]> ExportEnrollmentSummaryAsync(Guid academicHeadUserId, CancellationToken cancellationToken = default)
    {
        var department = await _scopeService.GetAssignedDepartmentAsync(academicHeadUserId, cancellationToken);
        return await _reportsService.ExportEnrollmentSummaryAsync(null, department, cancellationToken);
    }

    public async Task<IReadOnlyList<SectionFileResponse>> GetSectionFilesAsync(Guid academicHeadUserId, CancellationToken cancellationToken = default)
    {
        var department = await _scopeService.GetAssignedDepartmentAsync(academicHeadUserId, cancellationToken);
        return await _reportsService.GetSectionFilesAsync(null, department, cancellationToken);
    }

    public async Task<byte[]> ExportSectionFilesAsync(Guid academicHeadUserId, CancellationToken cancellationToken = default)
    {
        var department = await _scopeService.GetAssignedDepartmentAsync(academicHeadUserId, cancellationToken);
        return await _reportsService.ExportSectionFilesAsync(null, department, cancellationToken);
    }

    public async Task<IReadOnlyList<ScholarshipApplicantListItemResponse>> GetScholarshipApplicantListAsync(
        Guid academicHeadUserId, string? scholarshipName, string? status, CancellationToken cancellationToken = default)
    {
        var department = await _scopeService.GetAssignedDepartmentAsync(academicHeadUserId, cancellationToken);
        return await _reportsService.GetScholarshipApplicantListAsync(scholarshipName, status, department, cancellationToken);
    }

    public async Task<IReadOnlyList<ScholarshipQualificationListItemResponse>> GetScholarshipQualificationListAsync(
        Guid academicHeadUserId, string? verdict, CancellationToken cancellationToken = default)
    {
        var department = await _scopeService.GetAssignedDepartmentAsync(academicHeadUserId, cancellationToken);
        return await _reportsService.GetScholarshipQualificationListAsync(verdict, department, cancellationToken);
    }

    public async Task<IReadOnlyList<ScholarshipResultListItemResponse>> GetScholarshipResultListAsync(
        Guid academicHeadUserId, string? decision, CancellationToken cancellationToken = default)
    {
        var department = await _scopeService.GetAssignedDepartmentAsync(academicHeadUserId, cancellationToken);
        return await _reportsService.GetScholarshipResultListAsync(decision, department, cancellationToken);
    }

    public Task<IReadOnlyList<AdminScholarshipResponse>> GetScholarshipSlotReportAsync(CancellationToken cancellationToken = default) =>
        _reportsService.GetScholarshipSlotReportAsync(cancellationToken);

    public async Task<ApplicationTrendResponse> GetApplicationTrendAsync(
        Guid academicHeadUserId, int weeks, CancellationToken cancellationToken = default)
    {
        var department = await _scopeService.GetAssignedDepartmentAsync(academicHeadUserId, cancellationToken);
        return await _reportsService.GetApplicationTrendAsync(null, weeks, department, cancellationToken);
    }

    public async Task<ApplicationFunnelResponse> GetApplicationFunnelAsync(Guid academicHeadUserId, CancellationToken cancellationToken = default)
    {
        var department = await _scopeService.GetAssignedDepartmentAsync(academicHeadUserId, cancellationToken);
        return await _reportsService.GetApplicationFunnelAsync(null, department, cancellationToken);
    }
}
