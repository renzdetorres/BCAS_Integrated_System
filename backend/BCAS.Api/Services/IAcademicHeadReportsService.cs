using BCAS.Api.Models;

namespace BCAS.Api.Services;

/// <summary>
/// Academic Head reporting suite, scoped to the caller's own department
/// (BISAASS-49). Reuses IAdminReportsService (BISAASS-37) for the actual
/// queries/exports; the three Admission reports are forced-filtered to the
/// caller's Department (their own choice of program/applicationType is not
/// accepted - only applicationType, which is orthogonal to department). The
/// four Scholarship reports pass through unscoped, same as an Admin sees
/// them, since scholarships aren't tied to any department in this system.
/// </summary>
public interface IAcademicHeadReportsService
{
    /// <summary>Throws AcademicHeadDepartmentNotAssignedException if the caller has no Department set, or UserNotFoundException if the caller's account no longer exists.</summary>
    Task<IReadOnlyList<EnrollmentListItemResponse>> GetEnrollmentListAsync(
        Guid academicHeadUserId, string? applicationType, CancellationToken cancellationToken = default);

    Task<byte[]> ExportEnrollmentListAsync(
        Guid academicHeadUserId, string? applicationType, CancellationToken cancellationToken = default);

    Task<EnrollmentSummaryResponse> GetEnrollmentSummaryAsync(Guid academicHeadUserId, CancellationToken cancellationToken = default);

    Task<byte[]> ExportEnrollmentSummaryAsync(Guid academicHeadUserId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SectionFileResponse>> GetSectionFilesAsync(Guid academicHeadUserId, CancellationToken cancellationToken = default);

    Task<byte[]> ExportSectionFilesAsync(Guid academicHeadUserId, CancellationToken cancellationToken = default);

    /// <summary>Unscoped - same data an Admin-Registrar sees (BISAASS-37); scholarships have no department dimension.</summary>
    Task<IReadOnlyList<ScholarshipApplicantListItemResponse>> GetScholarshipApplicantListAsync(
        string? scholarshipName, string? status, CancellationToken cancellationToken = default);

    /// <summary>Unscoped - same data an Admin-Registrar sees (BISAASS-37); scholarships have no department dimension.</summary>
    Task<IReadOnlyList<ScholarshipQualificationListItemResponse>> GetScholarshipQualificationListAsync(
        string? verdict, CancellationToken cancellationToken = default);

    /// <summary>Unscoped - same data an Admin-Registrar sees (BISAASS-37); scholarships have no department dimension.</summary>
    Task<IReadOnlyList<ScholarshipResultListItemResponse>> GetScholarshipResultListAsync(
        string? decision, CancellationToken cancellationToken = default);

    /// <summary>Unscoped - same data an Admin-Registrar sees (BISAASS-37); scholarships have no department dimension.</summary>
    Task<IReadOnlyList<AdminScholarshipResponse>> GetScholarshipSlotReportAsync(CancellationToken cancellationToken = default);

    /// <summary>Weekly trend - the Admission series is scoped to the caller's Department, the Scholarship series is unscoped. Throws AcademicHeadDepartmentNotAssignedException if the caller has no Department set.</summary>
    Task<ApplicationTrendResponse> GetApplicationTrendAsync(Guid academicHeadUserId, int weeks, CancellationToken cancellationToken = default);

    /// <summary>Funnel - the Admission funnel is scoped to the caller's Department, the Scholarship funnel is unscoped. Throws AcademicHeadDepartmentNotAssignedException if the caller has no Department set.</summary>
    Task<ApplicationFunnelResponse> GetApplicationFunnelAsync(Guid academicHeadUserId, CancellationToken cancellationToken = default);
}
