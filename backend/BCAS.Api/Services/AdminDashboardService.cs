using BCAS.Api.Data;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class AdminDashboardService : IAdminDashboardService
{
    private const int RecentApplicationsCount = 5;

    private readonly IAdminDashboardRepository _dashboardRepository;

    public AdminDashboardService(IAdminDashboardRepository dashboardRepository)
    {
        _dashboardRepository = dashboardRepository;
    }

    public async Task<AdminDashboardResponse> GetDashboardAsync(string? department = null, CancellationToken cancellationToken = default)
    {
        var analytics = await _dashboardRepository.GetAnalyticsAsync(department, cancellationToken);
        var byProgram = await _dashboardRepository.GetByProgramAsync(department, cancellationToken);
        var byDepartment = await _dashboardRepository.GetByDepartmentAsync(department, cancellationToken);
        var recent = await _dashboardRepository.GetRecentAsync(RecentApplicationsCount, department, cancellationToken);
        var pendingDocuments = await _dashboardRepository.GetPendingDocumentsCountAsync(department, cancellationToken);

        var scholarshipAnalytics = await _dashboardRepository.GetScholarshipAnalyticsAsync(department, cancellationToken);
        var scholarshipByDepartment = await _dashboardRepository.GetScholarshipByDepartmentAsync(department, cancellationToken);
        var scholarshipByProgram = await _dashboardRepository.GetScholarshipByProgramAsync(department, cancellationToken);
        var scholarshipRecent = await _dashboardRepository.GetRecentScholarshipAsync(RecentApplicationsCount, department, cancellationToken);

        return new AdminDashboardResponse
        {
            TotalApplications = analytics.TotalApplications,
            TotalApplicants = analytics.TotalApplicants,
            PendingCount = analytics.PendingCount,
            ApprovedCount = analytics.ApprovedCount,
            RejectedCount = analytics.RejectedCount,
            SubmittedThisWeek = analytics.SubmittedThisWeek,
            UnassignedCount = analytics.UnassignedCount,
            PendingDocumentsCount = pendingDocuments,
            ByProgram = byProgram.Programs.Select(p => p.ToResponse()).ToList(),
            OtherProgramApplicants = byProgram.OtherApplicants,
            ByDepartment = byDepartment.Select(d => d.ToResponse()).ToList(),
            RecentApplications = recent.Select(a => a.ToResponse()).ToList(),
            Scholarship = new ScholarshipDashboardSummaryResponse
            {
                TotalApplications = scholarshipAnalytics.TotalApplications,
                TotalApplicants = scholarshipAnalytics.TotalApplicants,
                PendingCount = scholarshipAnalytics.PendingCount,
                ApprovedCount = scholarshipAnalytics.ApprovedCount,
                RejectedCount = scholarshipAnalytics.RejectedCount,
                SubmittedThisWeek = scholarshipAnalytics.SubmittedThisWeek,
                UnassignedCount = scholarshipAnalytics.UnassignedCount,
                ByDepartment = scholarshipByDepartment.Select(d => d.ToResponse()).ToList(),
                ByProgram = scholarshipByProgram.Select(p => p.ToResponse()).ToList(),
                RecentApplications = scholarshipRecent.Select(a => a.ToResponse()).ToList(),
            },
        };
    }
}
