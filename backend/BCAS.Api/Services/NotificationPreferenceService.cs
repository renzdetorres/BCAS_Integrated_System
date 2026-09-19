using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class NotificationPreferenceService : INotificationPreferenceService
{
    private readonly INotificationPreferenceRepository _preferenceRepository;

    public NotificationPreferenceService(INotificationPreferenceRepository preferenceRepository)
    {
        _preferenceRepository = preferenceRepository;
    }

    public async Task<IReadOnlyList<NotificationPreferenceResponse>> GetMyPreferencesAsync(
        Guid userId, CancellationToken cancellationToken = default)
    {
        var saved = await _preferenceRepository.GetByUserIdAsync(userId, cancellationToken);

        return NotificationEventTypes.DisplayNames.Keys
            .Select(type => new NotificationPreference
            {
                NotificationType = type,
                IsEnabled = !saved.TryGetValue(type, out var isEnabled) || isEnabled,
            }.ToResponse())
            .ToList();
    }

    public async Task<NotificationPreferenceResponse> SetMyPreferenceAsync(
        Guid userId,
        string notificationType,
        bool isEnabled,
        CancellationToken cancellationToken = default)
    {
        if (!NotificationEventTypes.AllowedTypes.Contains(notificationType))
        {
            throw new InvalidNotificationTypeException(notificationType);
        }

        await _preferenceRepository.SetEnabledAsync(userId, notificationType, isEnabled, cancellationToken);

        return new NotificationPreference { NotificationType = notificationType, IsEnabled = isEnabled }.ToResponse();
    }
}
