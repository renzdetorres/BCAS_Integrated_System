using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface INotificationSettingsRepository
{
    /// <summary>All configurable notification triggers, ordered by display name.</summary>
    Task<IReadOnlyList<NotificationTriggerConfig>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>Returns the updated trigger config, or null if no trigger has that key.</summary>
    Task<NotificationTriggerConfig?> SetEnabledAsync(string triggerKey, bool isEnabled, CancellationToken cancellationToken = default);
}
