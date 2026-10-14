using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class InterviewRecord
{
    public Guid InterviewId { get; set; }
    public Guid ApplicationId { get; set; }
    public Guid UserId { get; set; }
    public DateOnly InterviewDate { get; set; }
    public TimeOnly InterviewTime { get; set; }
    public string Location { get; set; } = string.Empty;
    public string? Instructions { get; set; }

    /// <summary>Scheduled, Completed or NoShow.</summary>
    public string Status { get; set; } = string.Empty;

    /// <summary>Passed or Failed once the interview has been evaluated.</summary>
    public string? Evaluation { get; set; }

    public string? EvaluationNotes { get; set; }
    public DateTime ScheduledAt { get; set; }
    public DateTime? EvaluatedAt { get; set; }
}

/// <summary>An applicant on the staff interview list: needing a schedule, scheduled, or evaluated.</summary>
public class InterviewQueueItem
{
    public Guid ApplicationId { get; set; }
    public Guid UserId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public string? Department { get; set; }
    public string CourseAppliedFor { get; set; } = string.Empty;
    public string? YearLevel { get; set; }
    public string ApplicationStatus { get; set; } = string.Empty;
    public DateOnly? InterviewDate { get; set; }
    public TimeOnly? InterviewTime { get; set; }
    public string? Location { get; set; }
    public string? Instructions { get; set; }
    public string? Evaluation { get; set; }
    public string? EvaluationNotes { get; set; }
    public DateTime? EvaluatedAt { get; set; }
}

/// <summary>The queue row as sent to the browser, with a single status the page can filter on.</summary>
public class InterviewQueueItemResponse
{
    public Guid ApplicationId { get; set; }
    public Guid UserId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public string? Department { get; set; }
    public string CourseAppliedFor { get; set; } = string.Empty;
    public string? YearLevel { get; set; }
    public string ApplicationStatus { get; set; } = string.Empty;

    /// <summary>NeedsSchedule, Scheduled, Passed or Failed.</summary>
    public string Stage { get; set; } = string.Empty;

    public DateOnly? InterviewDate { get; set; }
    public TimeOnly? InterviewTime { get; set; }
    public string? Location { get; set; }
    public string? Instructions { get; set; }
    public string? EvaluationNotes { get; set; }
    public DateTime? EvaluatedAt { get; set; }
}

public class ScheduleInterviewRequest
{
    [Required]
    public DateOnly? InterviewDate { get; set; }

    [Required]
    public TimeOnly? InterviewTime { get; set; }

    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string? Location { get; set; }

    [StringLength(500)]
    public string? Instructions { get; set; }
}

public class EvaluateInterviewRequest
{
    /// <summary>Passed or Failed. Passed moves the applicant on to enrollment; Failed closes the application.</summary>
    [Required]
    public string? Evaluation { get; set; }

    [StringLength(500)]
    public string? Notes { get; set; }
}

/// <summary>What the applicant's Interview page shows.</summary>
public class MyInterviewResponse
{
    /// <summary>NotYet, Scheduled, Passed or Failed.</summary>
    public string Status { get; set; } = "NotYet";

    public DateOnly? InterviewDate { get; set; }
    public TimeOnly? InterviewTime { get; set; }
    public string? Location { get; set; }
    public string? Instructions { get; set; }

    /// <summary>Always shown with an interview: bring the original copies of the submitted documents.</summary>
    public string Reminder { get; set; } = "Please bring the original copies of your submitted documents to the interview.";

    public string Message { get; set; } = string.Empty;
}
