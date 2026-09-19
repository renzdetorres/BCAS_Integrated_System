using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class UpdateNotificationPreferenceRequest
{
    // Nullable + Required so an omitted value is rejected rather than
    // silently defaulting to false (opting the applicant out).
    [Required]
    public bool? IsEnabled { get; set; }
}
