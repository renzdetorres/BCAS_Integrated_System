using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class CreateSemesterRequest
{
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public DateOnly? StartDate { get; set; }

    [Required]
    public DateOnly? EndDate { get; set; }
}
