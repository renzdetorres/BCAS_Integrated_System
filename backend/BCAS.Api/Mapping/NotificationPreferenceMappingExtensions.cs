using BCAS.Api.Constants;
using BCAS.Api.Models;

namespace BCAS.Api.Mapping;

public static class NotificationPreferenceMappingExtensions
{
    public static NotificationPreferenceResponse ToResponse(this NotificationPreference preference) => new()
    {
        NotificationType = preference.NotificationType,
        DisplayName = NotificationEventTypes.DisplayNames.GetValueOrDefault(preference.NotificationType, preference.NotificationType),
        IsEnabled = preference.IsEnabled,
    };
}
