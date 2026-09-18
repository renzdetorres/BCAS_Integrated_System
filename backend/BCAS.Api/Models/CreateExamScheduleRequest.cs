using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class CreateExamScheduleRequest
{
    /// <summary>Saturday or Weekday, validated server-side against ExamScheduleConstants.AllowedDayTypes.</summary>
    [Required]
    public string DayType { get; set; } = string.Empty;

    [Required]
    public DateOnly? ExamDate { get; set; }

    [Required]
    public TimeOnly? ExamTime { get; set; }

    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string Venue { get; set; } = string.Empty;

    /// <summary>
    /// Ignored for Saturday rows, which are always selectable regardless of
    /// this value. For Weekday rows, this is the Admin's call on whether a
    /// teacher is currently available to assist - true (the default) means
    /// applicants can select this slot.
    /// </summary>
    public bool IsOffered { get; set; } = true;
}
