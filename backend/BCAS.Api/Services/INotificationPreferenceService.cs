using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface INotificationPreferenceService
{
    /// <summary>All seven notification types (BISAASS-59) with the caller's current setting - enabled by default until changed.</summary>
    Task<IReadOnlyList<NotificationPreferenceResponse>> GetMyPreferencesAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>Throws InvalidNotificationTypeException if notificationType isn't one of the seven recognized types.</summary>
    Task<NotificationPreferenceResponse> SetMyPreferenceAsync(
        Guid userId,
        string notificationType,
        bool isEnabled,
        CancellationToken cancellationToken = default);
}
