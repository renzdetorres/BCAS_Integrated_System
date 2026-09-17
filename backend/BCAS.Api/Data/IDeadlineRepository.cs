using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface IDeadlineRepository
{
    Task<IReadOnlyList<Deadline>> GetUpcomingAsync(CancellationToken cancellationToken = default);
}
