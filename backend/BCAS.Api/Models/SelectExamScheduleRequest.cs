using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class SelectExamScheduleRequest
{
    [Required]
    public int? ExamScheduleId { get; set; }
}
