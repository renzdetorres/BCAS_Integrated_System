using BCAS.Api.Models;

namespace BCAS.Api.Mapping;

public static class SystemSettingMappingExtensions
{
    public static SystemSettingResponse ToResponse(this SystemSetting setting) => new()
    {
        SettingKey = setting.SettingKey,
        DisplayName = setting.DisplayName,
        Description = setting.Description,
        IsEnabled = setting.IsEnabled,
        UpdatedAt = setting.UpdatedAt,
    };
}
