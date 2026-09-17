using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface IAdminDashboardRepository
{
    /// <summary>Total/pending/approved/rejected counts across all admission applications.</summary>
    Task<AdmissionAnalytics> GetAnalyticsAsync(CancellationToken cancellationToken = default);

    /// <summary>Admission application counts grouped by course applied for, highest first.</summary>
    Task<IReadOnlyList<ProgramApplicantCount>> GetByProgramAsync(CancellationToken cancellationToken = default);

    /// <summary>The most recently submitted admission applications, newest first.</summary>
    Task<IReadOnlyList<RecentAdmissionApplication>> GetRecentAsync(int take, CancellationToken cancellationToken = default);
}
