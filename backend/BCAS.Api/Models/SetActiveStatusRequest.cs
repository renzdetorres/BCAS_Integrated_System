using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class SetActiveStatusRequest
{
    // Nullable + Required so an omitted value is rejected rather than
    // silently defaulting to false (deactivating the account).
    [Required]
    public bool? IsActive { get; set; }
}
