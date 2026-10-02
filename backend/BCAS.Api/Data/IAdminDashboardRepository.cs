using BCAS.Api.Models;

namespace BCAS.Api.Data;

/// <remarks>
/// Every read takes an optional department - set for an Academic Head's
/// view, null for the school-wide Admin-Registrar view. Admission rows
/// match on AdmissionApplications.Department; scholarship rows and
/// documents match on their applicant's latest admission application
/// (vw_ApplicantDepartments).
/// </remarks>
public interface IAdminDashboardRepository
{
    /// <summary>Total/pending/approved/rejected, this week's, and unassigned counts across admission applications.</summary>
    Task<AdmissionAnalytics> GetAnalyticsAsync(string? department = null, CancellationToken cancellationToken = default);

    /// <summary>Admission application counts grouped by course applied for, highest first.</summary>
    Task<IReadOnlyList<ProgramApplicantCount>> GetByProgramAsync(string? department = null, CancellationToken cancellationToken = default);

    /// <summary>Admission application counts per department; a null Department is the unassigned bucket.</summary>
    Task<IReadOnlyList<DepartmentCount>> GetByDepartmentAsync(string? department = null, CancellationToken cancellationToken = default);

    /// <summary>The most recently submitted admission applications, newest first.</summary>
    Task<IReadOnlyList<RecentAdmissionApplication>> GetRecentAsync(
        int take, string? department = null, CancellationToken cancellationToken = default);

    /// <summary>Uploaded, non-archived applicant documents still Pending verification.</summary>
    Task<int> GetPendingDocumentsCountAsync(string? department = null, CancellationToken cancellationToken = default);

    /// <summary>Same as GetAnalyticsAsync, for scholarship applications (Pending = not yet Approved or Rejected).</summary>
    Task<AdmissionAnalytics> GetScholarshipAnalyticsAsync(string? department = null, CancellationToken cancellationToken = default);

    /// <summary>Distinct scholarship applicants per scholarship, highest first.</summary>
    Task<IReadOnlyList<ProgramApplicantCount>> GetScholarshipByProgramAsync(string? department = null, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DepartmentCount>> GetScholarshipByDepartmentAsync(string? department = null, CancellationToken cancellationToken = default);

    /// <summary>The most recently submitted scholarship applications, newest first.</summary>
    Task<IReadOnlyList<RecentScholarshipApplication>> GetRecentScholarshipAsync(
        int take, string? department = null, CancellationToken cancellationToken = default);
}
