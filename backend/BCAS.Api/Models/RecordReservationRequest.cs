using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class RecordReservationRequest
{
    // Nullable + Required so an omitted value is rejected rather than
    // silently defaulting to false (recording as unreserved).
    [Required]
    public bool? IsReserved { get; set; }

    [StringLength(500)]
    public string? Remarks { get; set; }
}
