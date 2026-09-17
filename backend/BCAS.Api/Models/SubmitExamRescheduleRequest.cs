using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class SubmitExamRescheduleRequest
{
    [Required]
    [StringLength(500, MinimumLength = 1)]
    public string? Reason { get; set; }
}
