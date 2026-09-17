using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class NotificationSettingsService : INotificationSettingsService
{
    private readonly INotificationSettingsRepository _notificationSettingsRepository;
    private readonly ILogger<NotificationSettingsService> _logger;

    public NotificationSettingsService(
        INotificationSettingsRepository notificationSettingsRepository,
        ILogger<NotificationSettingsService> logger)
    {
        _notificationSettingsRepository = notificationSettingsRepository;
        _logger = logger;
    }

    public async Task<IReadOnlyList<NotificationTriggerConfigResponse>> ListTriggersAsync(CancellationToken cancellationToken = default)
    {
        var configs = await _notificationSettingsRepository.GetAllAsync(cancellationToken);
        return configs.Select(c => c.ToResponse()).ToList();
    }

    public async Task<NotificationTriggerConfigResponse> SetTriggerEnabledAsync(
        string triggerKey,
        bool isEnabled,
        CancellationToken cancellationToken = default)
    {
        var config = await _notificationSettingsRepository.SetEnabledAsync(triggerKey, isEnabled, cancellationToken)
            ?? throw new NotificationTriggerNotFoundException(triggerKey);

        _logger.LogInformation("Notification trigger {TriggerKey} set to IsEnabled={IsEnabled}", config.TriggerKey, config.IsEnabled);

        return config.ToResponse();
    }
}
