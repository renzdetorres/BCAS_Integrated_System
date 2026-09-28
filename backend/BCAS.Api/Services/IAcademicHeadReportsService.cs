using BCAS.Api.Models;

namespace BCAS.Api.Services;

/// <summary>
/// Academic Head reporting suite, scoped to the caller's assigned department
/// (IAcademicHeadScopeService). Reuses IAdminReportsService (BISAASS-37) for
/// the actual queries/exports with the caller's department forced in -
/// no program or department filter is accepted from the client. Admission
/// reports match each application's own Department; Scholarship reports
/// match each applicant's latest admission application. Every method that
/// takes academicHeadUserId throws AcademicHeadDepartmentNotAssignedException
/// if the caller has no department set, or UserNotFoundException if the
/// caller's account no longer exists.
/// </summary>
public interface IAcademicHeadReportsService
{
    Task<IReadOnlyList<EnrollmentListItemResponse>> GetEnrollmentListAsync(
        Guid academicHeadUserId, string? applicationType, CancellationToken cancellationToken = default);

    Task<byte[]> ExportEnrollmentListAsync(
        Guid academicHeadUserId, string? applicationType, CancellationToken cancellationToken = default);

    Task<EnrollmentSummaryResponse> GetEnrollmentSummaryAsync(Guid academicHeadUserId, CancellationToken cancellationToken = default);

    Task<byte[]> ExportEnrollmentSummaryAsync(Guid academicHeadUserId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SectionFileResponse>> GetSectionFilesAsync(Guid academicHeadUserId, CancellationToken cancellationToken = default);

    Task<byte[]> ExportSectionFilesAsync(Guid academicHeadUserId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ScholarshipApplicantListItemResponse>> GetScholarshipApplicantListAsync(
        Guid academicHeadUserId, string? scholarshipName, string? status, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ScholarshipQualificationListItemResponse>> GetScholarshipQualificationListAsync(
        Guid academicHeadUserId, string? verdict, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ScholarshipResultListItemResponse>> GetScholarshipResultListAsync(
        Guid academicHeadUserId, string? decision, CancellationToken cancellationToken = default);

    /// <summary>
    /// The school-wide scholarship catalog with slot counts - not scoped,
    /// since it describes scholarships rather than any department's
    /// applicants.
    /// </summary>
    Task<IReadOnlyList<AdminScholarshipResponse>> GetScholarshipSlotReportAsync(CancellationToken cancellationToken = default);

    /// <summary>Weekly trend - both the Admission and Scholarship series scoped to the caller's department.</summary>
    Task<ApplicationTrendResponse> GetApplicationTrendAsync(Guid academicHeadUserId, int weeks, CancellationToken cancellationToken = default);

    /// <summary>Funnel - both the Admission and Scholarship funnels scoped to the caller's department.</summary>
    Task<ApplicationFunnelResponse> GetApplicationFunnelAsync(Guid academicHeadUserId, CancellationToken cancellationToken = default);
}
