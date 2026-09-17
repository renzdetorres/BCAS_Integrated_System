using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface IAnnouncementRepository
{
    /// <summary>Currently-active announcements, most recently posted first.</summary>
    Task<IReadOnlyList<Announcement>> GetActiveAsync(CancellationToken cancellationToken = default);
}
