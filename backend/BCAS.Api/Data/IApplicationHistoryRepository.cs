using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface IApplicationHistoryRepository
{
    /// <summary>
    /// All of a user's admission and scholarship applications together,
    /// most recent first.
    /// </summary>
    Task<IReadOnlyList<ApplicationHistoryItem>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
}
