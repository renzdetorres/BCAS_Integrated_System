using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class SetExamDateOfferedRequest
{
    // Nullable + Required so an omitted value is rejected instead of silently withdrawing the date.
    [Required]
    public bool? IsOffered { get; set; }
}
