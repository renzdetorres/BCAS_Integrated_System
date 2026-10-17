using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class CreateExamScheduleRequest
{
    [Required]
    public DateOnly? ExamDate { get; set; }

    [Required]
    public TimeOnly? ExamTime { get; set; }

    /// <summary>Whether applicants can book this slot as soon as it is added. Defaults to offered.</summary>
    public bool IsOffered { get; set; } = true;

    /// <summary>How many applicants the slot holds. Leave blank for no limit.</summary>
    [Range(1, 5000)]
    public int? Capacity { get; set; }
}
