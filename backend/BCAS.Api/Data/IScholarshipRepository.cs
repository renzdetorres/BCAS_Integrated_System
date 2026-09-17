using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface IScholarshipRepository
{
    /// <summary>Active scholarships with at least one remaining slot, for applicants to browse.</summary>
    Task<IReadOnlyList<Scholarship>> GetAvailableAsync(CancellationToken cancellationToken = default);
}
