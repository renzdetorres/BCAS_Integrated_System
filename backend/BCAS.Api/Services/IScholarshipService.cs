using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IScholarshipService
{
    Task<IReadOnlyList<ScholarshipResponse>> GetAvailableAsync(CancellationToken cancellationToken = default);
}
