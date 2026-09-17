using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class SystemSettingsService : ISystemSettingsService
{
    private readonly ISystemSettingsRepository _systemSettingsRepository;
    private readonly ILogger<SystemSettingsService> _logger;

    public SystemSettingsService(
        ISystemSettingsRepository systemSettingsRepository,
        ILogger<SystemSettingsService> logger)
    {
        _systemSettingsRepository = systemSettingsRepository;
        _logger = logger;
    }

    public async Task<IReadOnlyList<SystemSettingResponse>> ListSettingsAsync(CancellationToken cancellationToken = default)
    {
        var settings = await _systemSettingsRepository.GetAllAsync(cancellationToken);
        return settings.Select(s => s.ToResponse()).ToList();
    }

    public async Task<SystemSettingResponse> SetSettingEnabledAsync(
        string settingKey,
        bool isEnabled,
        CancellationToken cancellationToken = default)
    {
        var setting = await _systemSettingsRepository.SetEnabledAsync(settingKey, isEnabled, cancellationToken)
            ?? throw new SystemSettingNotFoundException(settingKey);

        _logger.LogInformation("System setting {SettingKey} set to IsEnabled={IsEnabled}", setting.SettingKey, setting.IsEnabled);

        return setting.ToResponse();
    }
}
