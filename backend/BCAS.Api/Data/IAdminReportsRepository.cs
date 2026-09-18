using BCAS.Api.Models;

namespace BCAS.Api.Data;

/// <summary>Admin-Registrar reporting suite (BISAASS-37) - all reads, no writes.</summary>
public interface IAdminReportsRepository
{
    /// <summary>
    /// Enrolled admission applicants - Approved applications whose
    /// applicant has reserved their slot (BISAASS-33) - optionally
    /// narrowed by program (course, partial match) and/or application
    /// type. Backs the Enrollment List, Summary of Enrollment, and File
    /// per Section reports, which all derive from this same set.
    /// </summary>
    Task<IReadOnlyList<EnrollmentListItem>> GetEnrollmentListAsync(
        string? program, string? applicationType, CancellationToken cancellationToken = default);

    /// <summary>Every scholarship application regardless of status, optionally narrowed by scholarship name (partial match) and/or status.</summary>
    Task<IReadOnlyList<ScholarshipApplicantListItem>> GetScholarshipApplicantListAsync(
        string? scholarshipName, string? status, CancellationToken cancellationToken = default);

    /// <summary>Every eligibility screening verdict, optionally narrowed by verdict (Qualified/NotQualified).</summary>
    Task<IReadOnlyList<ScholarshipQualificationListItem>> GetScholarshipQualificationListAsync(
        string? verdict, CancellationToken cancellationToken = default);

    /// <summary>
    /// Scholarship applications with a final Status of Approved or
    /// Rejected, optionally narrowed by decision (matched against the
    /// ScholarshipFinalDecisions row when one exists, else Status itself).
    /// </summary>
    Task<IReadOnlyList<ScholarshipResultListItem>> GetScholarshipResultListAsync(
        string? decision, CancellationToken cancellationToken = default);

    /// <summary>A single scholarship application's result-report row by id, or null if no such application exists.</summary>
    Task<ScholarshipResultListItem?> GetScholarshipResultByApplicationIdAsync(
        Guid applicationId, CancellationToken cancellationToken = default);
}
