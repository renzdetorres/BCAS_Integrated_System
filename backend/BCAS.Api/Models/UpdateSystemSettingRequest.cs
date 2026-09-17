using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class UpdateSystemSettingRequest
{
    // Nullable + Required so an omitted value is rejected rather than
    // silently defaulting to false (turning the setting off).
    [Required]
    public bool? IsEnabled { get; set; }
}
