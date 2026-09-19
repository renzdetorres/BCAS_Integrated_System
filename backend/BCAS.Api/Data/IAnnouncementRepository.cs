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
    /// deleting it. WasActive is the value IsActive held immediately
    /// before this call (read atomically as part of the same UPDATE, so
    /// two concurrent calls can never both observe "not yet active") - the
    /// caller uses it to tell an announcement's first posting apart from a
    /// no-op re-toggle. Announcement is null if no announcement with that
    /// id exists, in which case WasActive is meaningless (always false).
    /// </summary>
    Task<(Announcement? Announcement, bool WasActive)> SetActiveStatusAsync(int announcementId, bool isActive, CancellationToken cancellationToken = default);
}
