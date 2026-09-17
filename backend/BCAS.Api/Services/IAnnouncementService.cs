using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IAnnouncementService
{
    Task<IReadOnlyList<AnnouncementResponse>> GetActiveAsync(CancellationToken cancellationToken = default);
}
