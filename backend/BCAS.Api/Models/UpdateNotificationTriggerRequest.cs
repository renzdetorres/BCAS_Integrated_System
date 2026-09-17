using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class UpdateNotificationTriggerRequest
{
    // Nullable + Required so an omitted value is rejected rather than
    // silently defaulting to false (turning the trigger off).
    [Required]
    public bool? IsEnabled { get; set; }
}
