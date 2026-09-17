using BCAS.Api.Data;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class ApplicationHistoryService : IApplicationHistoryService
{
    private readonly IApplicationHistoryRepository _historyRepository;

    public ApplicationHistoryService(IApplicationHistoryRepository historyRepository)
    {
        _historyRepository = historyRepository;
    }

    public async Task<IReadOnlyList<ApplicationHistoryItemResponse>> GetMyHistoryAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var items = await _historyRepository.GetByUserIdAsync(userId, cancellationToken);
        return items.Select(i => i.ToResponse()).ToList();
    }
}
