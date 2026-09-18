using BCAS.Api.Models;

namespace BCAS.Api.Services;

/// <summary>Admin-Registrar reporting suite (BISAASS-37): Admission and Scholarship reports, Excel export, printable scholarship contracts.</summary>
public interface IAdminReportsService
{
    Task<IReadOnlyList<EnrollmentListItemResponse>> GetEnrollmentListAsync(
        string? program, string? applicationType, CancellationToken cancellationToken = default);

    /// <summary>
    /// Total enrolled plus counts by program and by application type,
    /// derived from the same Enrollment List, optionally narrowed by
    /// program (course, partial match - BISAASS-49 passes an Academic
    /// Head's Department here to scope the summary to it).
    /// </summary>
    Task<EnrollmentSummaryResponse> GetEnrollmentSummaryAsync(string? program = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Enrolled applicants grouped by section (their applied-for course -
    /// see SectionFileResponse), optionally narrowed by program (course,
    /// partial match - BISAASS-49 passes an Academic Head's Department here).
    /// </summary>
    Task<IReadOnlyList<SectionFileResponse>> GetSectionFilesAsync(string? program = null, CancellationToken cancellationToken = default);

    Task<byte[]> ExportEnrollmentListAsync(string? program, string? applicationType, CancellationToken cancellationToken = default);

    Task<byte[]> ExportEnrollmentSummaryAsync(string? program = null, CancellationToken cancellationToken = default);

    Task<byte[]> ExportSectionFilesAsync(string? program = null, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ScholarshipApplicantListItemResponse>> GetScholarshipApplicantListAsync(
        string? scholarshipName, string? status, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ScholarshipQualificationListItemResponse>> GetScholarshipQualificationListAsync(
        string? verdict, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ScholarshipResultListItemResponse>> GetScholarshipResultListAsync(
        string? decision, CancellationToken cancellationToken = default);

    /// <summary>Every scholarship with its slot counts (reuses IScholarshipRepository - same data AdminScholarshipsController exposes).</summary>
    Task<IReadOnlyList<AdminScholarshipResponse>> GetScholarshipSlotReportAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// A printable scholarship record/contract for one application. Throws
    /// ScholarshipContractNotAvailableException if no such application
    /// exists or its Status isn't Approved.
    /// </summary>
    Task<ScholarshipContractResponse> GetScholarshipContractAsync(Guid applicationId, CancellationToken cancellationToken = default);
}
