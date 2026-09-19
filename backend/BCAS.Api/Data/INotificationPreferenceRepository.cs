namespace BCAS.Api.Data;

public interface INotificationPreferenceRepository
{
    /// <summary>
    /// Every notification type this user has ever explicitly set, by
    /// NotificationType. A type with no row here is still enabled (the
    /// default) - callers fill in the rest of
    /// NotificationEventTypes.AllowedTypes themselves.
    /// </summary>
    Task<IReadOnlyDictionary<string, bool>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>Whether userId still receives notificationType - true (the default) if no row exists.</summary>
    Task<bool> IsEnabledAsync(Guid userId, string notificationType, CancellationToken cancellationToken = default);

    /// <summary>
    /// Of userIds, the subset that has explicitly opted out of
    /// notificationType - everyone else (including anyone with no row at
    /// all) is still enabled, the default. One batched query regardless of
    /// how many userIds are given, instead of one IsEnabledAsync call per
    /// user - used by a broadcast (e.g. NotifyAnnouncementAsync) so
    /// checking preferences for a large recipient list doesn't cost one
    /// round trip per recipient.
    /// </summary>
    Task<IReadOnlySet<Guid>> GetOptedOutUserIdsAsync(
        IReadOnlyList<Guid> userIds, string notificationType, CancellationToken cancellationToken = default);

    /// <summary>Inserts or updates one (userId, notificationType) preference.</summary>
    Task SetEnabledAsync(Guid userId, string notificationType, bool isEnabled, CancellationToken cancellationToken = default);
}
