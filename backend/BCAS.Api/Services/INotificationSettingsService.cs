using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface INotificationSettingsService
{
    Task<IReadOnlyList<NotificationTriggerConfigResponse>> ListTriggersAsync(CancellationToken cancellationToken = default);

    /// <summary>Throws NotificationTriggerNotFoundException if no trigger has that key.</summary>
    Task<NotificationTriggerConfigResponse> SetTriggerEnabledAsync(
        string triggerKey,
        bool isEnabled,
        CancellationToken cancellationToken = default);
}
