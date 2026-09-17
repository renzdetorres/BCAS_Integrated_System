using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface ISystemSettingsRepository
{
    /// <summary>All configurable system settings, ordered by display name.</summary>
    Task<IReadOnlyList<SystemSetting>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>Returns the updated setting, or null if no setting has that key.</summary>
    Task<SystemSetting?> SetEnabledAsync(string settingKey, bool isEnabled, CancellationToken cancellationToken = default);

    /// <summary>
    /// True if the setting is on, or if no row has that key - application
    /// gating code fails open rather than silently blocking behavior a
    /// migration hasn't seeded a row for yet.
    /// </summary>
    Task<bool> IsEnabledAsync(string settingKey, CancellationToken cancellationToken = default);
}
