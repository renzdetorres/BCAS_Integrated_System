using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class SelectExamScheduleRequest
{
    [Required]
    public int? ExamScheduleId { get; set; }

    /// <summary>Optional; defaults to the entrance exam. See ExamTypes.</summary>
    [StringLength(40)]
    public string? ExamType { get; set; }
}
