using BCAS.Api.Models;

namespace BCAS.Api.Data;

/// <remarks>
/// Every read takes an optional department - an exact match on
/// AdmissionApplications.Department, set for an Academic Head's view and
/// null for the school-wide Admin-Registrar view.
/// </remarks>
public interface IAdminDashboardRepository
{
    /// <summary>Total/pending/approved/rejected counts across admission applications.</summary>
    Task<AdmissionAnalytics> GetAnalyticsAsync(string? department = null, CancellationToken cancellationToken = default);

    /// <summary>Admission application counts grouped by course applied for, highest first.</summary>
    Task<IReadOnlyList<ProgramApplicantCount>> GetByProgramAsync(string? department = null, CancellationToken cancellationToken = default);

    /// <summary>The most recently submitted admission applications, newest first.</summary>
    Task<IReadOnlyList<RecentAdmissionApplication>> GetRecentAsync(
        int take, string? department = null, CancellationToken cancellationToken = default);
}
