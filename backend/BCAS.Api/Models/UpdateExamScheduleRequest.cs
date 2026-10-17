using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

/// <summary>Changes a slot's time and seat count. The date stays: moving to another day is a new slot.</summary>
public class UpdateExamScheduleRequest
{
    [Required]
    public TimeOnly? ExamTime { get; set; }

    /// <summary>Blank for no limit.</summary>
    [Range(1, 5000)]
    public int? Capacity { get; set; }
}
