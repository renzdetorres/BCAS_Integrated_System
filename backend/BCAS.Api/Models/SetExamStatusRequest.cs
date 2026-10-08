using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class SetExamStatusRequest
{
    /// <summary>Scheduled, ExamDone, Rescheduled or DidNotTakeExam.</summary>
    [Required]
    [StringLength(30)]
    public string? Status { get; set; }
}
