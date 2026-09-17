using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IApplicationHistoryService
{
    Task<IReadOnlyList<ApplicationHistoryItemResponse>> GetMyHistoryAsync(Guid userId, CancellationToken cancellationToken = default);
}
