using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

/// <summary>One attempt at the entrance exam and what came of it.</summary>
public class ExamResultRecord
{
    public Guid ResultId { get; set; }
    public Guid ApplicationId { get; set; }
    public Guid UserId { get; set; }
    public int Attempt { get; set; }

    /// <summary>Passed, Failed or Retake.</summary>
    public string Result { get; set; } = string.Empty;

    public decimal? Score { get; set; }
    public string? Remarks { get; set; }
    public DateOnly? ExamDate { get; set; }
    public DateTime RecordedAt { get; set; }
}

/// <summary>An applicant on the staff exam-results list: waiting for a result, or already given one.</summary>
public class ExamResultQueueItem
{
    public Guid ApplicationId { get; set; }
    public Guid UserId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public string? Department { get; set; }
    public string CourseAppliedFor { get; set; } = string.Empty;
    public string? YearLevel { get; set; }
    public string ApplicationStatus { get; set; } = string.Empty;
    public DateOnly? ExamDate { get; set; }

    /// <summary>The latest recorded result, or null while the result is still to be recorded.</summary>
    public string? Result { get; set; }

    public decimal? Score { get; set; }
    public string? Remarks { get; set; }
    public int Attempts { get; set; }
    public DateTime? RecordedAt { get; set; }
}

public class RecordExamResultRequest
{
    /// <summary>Passed, Failed or Retake.</summary>
    [Required]
    public string? Result { get; set; }

    [Range(0, 100)]
    public decimal? Score { get; set; }

    [StringLength(500)]
    public string? Remarks { get; set; }
}

/// <summary>What the applicant's Exam Result page shows.</summary>
public class MyExamResultResponse
{
    /// <summary>Waiting, Passed, Failed or Retake: Waiting means no result has been released yet.</summary>
    public string Status { get; set; } = "Waiting";

    public decimal? Score { get; set; }
    public string? Remarks { get; set; }
    public DateTime? ReleasedAt { get; set; }
    public int Attempt { get; set; }

    /// <summary>What to do next, in plain words.</summary>
    public string NextStep { get; set; } = string.Empty;

    public string? NextStepPath { get; set; }

    /// <summary>Earlier attempts, newest first.</summary>
    public IReadOnlyList<ExamAttemptResponse> History { get; set; } = Array.Empty<ExamAttemptResponse>();
}

public class ExamAttemptResponse
{
    public int Attempt { get; set; }
    public string Result { get; set; } = string.Empty;
    public decimal? Score { get; set; }
    public DateOnly? ExamDate { get; set; }
    public DateTime RecordedAt { get; set; }
}
