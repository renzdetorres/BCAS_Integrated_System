using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IAdminDashboardService
{
    /// <summary>
    /// Admission analytics. department (exact match on
    /// AdmissionApplications.Department) scopes every figure to one
    /// department - an Academic Head's view; null is the school-wide
    /// Admin-Registrar view.
    /// </summary>
    Task<AdminDashboardResponse> GetDashboardAsync(string? department = null, CancellationToken cancellationToken = default);
}
