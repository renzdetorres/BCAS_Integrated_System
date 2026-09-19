using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class UpdateNotificationPreferenceRequest
{
    [Required]
    public bool IsEnabled { get; set; }
}
