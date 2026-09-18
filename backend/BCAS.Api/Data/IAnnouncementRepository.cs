using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface IAnnouncementRepository
{
    /// <summary>Currently-active announcements, most recently posted first.</summary>
    Task<IReadOnlyList<Announcement>> GetActiveAsync(CancellationToken cancellationToken = default);

    /// <summary>Admin-only (BISAASS-36): every announcement regardless of active status, most recently posted first.</summary>
    Task<IReadOnlyList<Announcement>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Admin-only: creates a new announcement as a draft (IsActive = false)
    /// - it does not appear to applicants until explicitly posted via
    /// SetActiveStatusAsync.
    /// </summary>
    Task<Announcement> CreateAsync(string category, string title, string body, CancellationToken cancellationToken = default);

    /// <summary>
    /// Admin-only: posts (activates) or deactivates an announcement without
    /// deleting it. Returns null if no announcement with that id exists.
    /// </summary>
    Task<Announcement?> SetActiveStatusAsync(int announcementId, bool isActive, CancellationToken cancellationToken = default);
}
