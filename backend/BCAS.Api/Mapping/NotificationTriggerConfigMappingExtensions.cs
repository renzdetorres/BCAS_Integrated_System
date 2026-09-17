using BCAS.Api.Models;

namespace BCAS.Api.Mapping;

public static class NotificationTriggerConfigMappingExtensions
{
    public static NotificationTriggerConfigResponse ToResponse(this NotificationTriggerConfig config) => new()
    {
        TriggerKey = config.TriggerKey,
        DisplayName = config.DisplayName,
        Description = config.Description,
        IsEnabled = config.IsEnabled,
        UpdatedAt = config.UpdatedAt,
    };
}
