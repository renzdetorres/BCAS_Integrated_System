using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class AcademicHeadReportsService : IAcademicHeadReportsService
{
    private readonly IAdminReportsService _reportsService;
    private readonly IUserRepository _userRepository;

    public AcademicHeadReportsService(IAdminReportsService reportsService, IUserRepository userRepository)
    {
        _reportsService = reportsService;
        _userRepository = userRepository;
    }

    public async Task<IReadOnlyList<EnrollmentListItemResponse>> GetEnrollmentListAsync(
        Guid academicHeadUserId, string? applicationType, CancellationToken cancellationToken = default)
    {
        var department = await ResolveDepartmentAsync(academicHeadUserId, cancellationToken);
        return await _reportsService.GetEnrollmentListAsync(department, applicationType, cancellationToken);
    }

    public async Task<byte[]> ExportEnrollmentListAsync(
        Guid academicHeadUserId, string? applicationType, CancellationToken cancellationToken = default)
    {
        var department = await ResolveDepartmentAsync(academicHeadUserId, cancellationToken);
        return await _reportsService.ExportEnrollmentListAsync(department, applicationType, cancellationToken);
    }

    public async Task<EnrollmentSummaryResponse> GetEnrollmentSummaryAsync(Guid academicHeadUserId, CancellationToken cancellationToken = default)
    {
        var department = await ResolveDepartmentAsync(academicHeadUserId, cancellationToken);
        return await _reportsService.GetEnrollmentSummaryAsync(department, cancellationToken);
    }

    public async Task<byte[]> ExportEnrollmentSummaryAsync(Guid academicHeadUserId, CancellationToken cancellationToken = default)
    {
        var department = await ResolveDepartmentAsync(academicHeadUserId, cancellationToken);
        return await _reportsService.ExportEnrollmentSummaryAsync(department, cancellationToken);
    }

    public async Task<IReadOnlyList<SectionFileResponse>> GetSectionFilesAsync(Guid academicHeadUserId, CancellationToken cancellationToken = default)
    {
        var department = await ResolveDepartmentAsync(academicHeadUserId, cancellationToken);
        return await _reportsService.GetSectionFilesAsync(department, cancellationToken);
    }

    public async Task<byte[]> ExportSectionFilesAsync(Guid academicHeadUserId, CancellationToken cancellationToken = default)
    {
        var department = await ResolveDepartmentAsync(academicHeadUserId, cancellationToken);
        return await _reportsService.ExportSectionFilesAsync(department, cancellationToken);
    }

    public Task<IReadOnlyList<ScholarshipApplicantListItemResponse>> GetScholarshipApplicantListAsync(
        string? scholarshipName, string? status, CancellationToken cancellationToken = default) =>
        _reportsService.GetScholarshipApplicantListAsync(scholarshipName, status, cancellationToken);

    public Task<IReadOnlyList<ScholarshipQualificationListItemResponse>> GetScholarshipQualificationListAsync(
        string? verdict, CancellationToken cancellationToken = default) =>
        _reportsService.GetScholarshipQualificationListAsync(verdict, cancellationToken);

    public Task<IReadOnlyList<ScholarshipResultListItemResponse>> GetScholarshipResultListAsync(
        string? decision, CancellationToken cancellationToken = default) =>
        _reportsService.GetScholarshipResultListAsync(decision, cancellationToken);

    public Task<IReadOnlyList<AdminScholarshipResponse>> GetScholarshipSlotReportAsync(CancellationToken cancellationToken = default) =>
        _reportsService.GetScholarshipSlotReportAsync(cancellationToken);

    private async Task<string> ResolveDepartmentAsync(Guid academicHeadUserId, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByIdAsync(academicHeadUserId, cancellationToken)
            ?? throw new UserNotFoundException(academicHeadUserId);

        if (string.IsNullOrWhiteSpace(user.Department))
        {
            throw new AcademicHeadDepartmentNotAssignedException();
        }

        return user.Department;
    }
}
