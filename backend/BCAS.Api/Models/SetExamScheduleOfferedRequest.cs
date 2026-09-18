using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class SetExamScheduleOfferedRequest
{
    // Nullable + Required so an omitted value is rejected rather than
    // silently defaulting to false (withdrawing the schedule).
    [Required]
    public bool? IsOffered { get; set; }
}
