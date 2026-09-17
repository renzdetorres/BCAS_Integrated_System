using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface ISystemSettingsService
{
    Task<IReadOnlyList<SystemSettingResponse>> ListSettingsAsync(CancellationToken cancellationToken = default);

    /// <summary>Throws SystemSettingNotFoundException if no setting has that key.</summary>
    Task<SystemSettingResponse> SetSettingEnabledAsync(
        string settingKey,
        bool isEnabled,
        CancellationToken cancellationToken = default);
}
