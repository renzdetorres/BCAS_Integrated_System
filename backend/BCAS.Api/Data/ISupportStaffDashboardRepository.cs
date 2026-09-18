using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface ISupportStaffDashboardRepository
{
    /// <summary>
    /// Pending-verification, verified-today, and flagged document counts
    /// from dbo.ApplicantDocuments, plus the total number of Applicant-role
    /// accounts.
    /// </summary>
    Task<SupportStaffDashboardResponse> GetCountsAsync(CancellationToken cancellationToken = default);
}
