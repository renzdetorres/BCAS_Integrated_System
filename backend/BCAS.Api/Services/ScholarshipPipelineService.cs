using System.Data;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Services;

/// <summary>Everything the scholarship pipeline knows about one scholarship application.</summary>
public class ScholarshipPipelineRow
{
    public Guid ApplicationId { get; set; }
    public Guid UserId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public string ScholarshipName { get; set; } = string.Empty;
    public string? Level { get; set; }
    public string? Department { get; set; }
    public decimal GradeAverage { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
    public string? Verdict { get; set; }
    public bool ExamScheduled { get; set; }
    public string? ExamStatus { get; set; }
    public string? ExamResult { get; set; }
    public decimal? ExamScore { get; set; }
    public string? ExamRemarks { get; set; }
    public decimal? InterviewScore { get; set; }
    public decimal? EssayScore { get; set; }
    public string? InterviewNotes { get; set; }
    public bool Interviewed { get; set; }
}

/// <summary>Where a scholarship application stands on the applicant-facing tracker.</summary>
public class ScholarshipProgress
{
    public IReadOnlyList<TrackingStepResponse> Steps { get; set; } = Array.Empty<TrackingStepResponse>();
    public string SubProcess { get; set; } = string.Empty;
    public string NextAction { get; set; } = string.Empty;
    public string? NextActionPath { get; set; }
    public int StageIndex { get; set; }
}

/// <summary>
/// The six scholarship stages an applicant sees: Application, Evaluation,
/// Scholarship Exam, Exam Result, Interview / Essay and Scholarship Result.
/// Derived from the existing workflow status plus the exam result and the
/// interview / essay evaluation, so the staff workflow itself is untouched.
/// </summary>
public static class ScholarshipTracker
{
    public static readonly IReadOnlyList<string> Stages = new[]
    {
        "Application", "Evaluation", "ScholarshipExam", "ExamResult", "InterviewEssay", "ScholarshipResult",
    };

    public static ScholarshipProgress Build(ScholarshipPipelineRow row)
    {
        var (index, sub, next, path) = Locate(row);
        var granted = row.Status == "Approved";

        var steps = Stages
            .Select((stage, i) => new TrackingStepResponse
            {
                Step = stage,
                IsComplete = i < index || (granted && i == Stages.Count - 1),
                IsCurrent = i == index,
            })
            .ToList();

        return new ScholarshipProgress { Steps = steps, SubProcess = sub, NextAction = next, NextActionPath = path, StageIndex = index };
    }

    private static (int Index, string Sub, string Next, string? Path) Locate(ScholarshipPipelineRow row)
    {
        switch (row.Status)
        {
            case "Waitlisted":
                return (0, "On the waitlist", "The scholarship is full right now. Your application moves forward automatically if a slot opens.", null);
            case "Submitted":
                // Submitting is the applicant's own step, so it is done: they wait in the evaluation stage (stage 2 of 6).
                return (1, "Waiting for evaluation", "Your application is received. Upload the scholarship documents so evaluation can begin.", "/application-tracking");
            case "DocumentsVerified":
                return (1, "Documents verified", "Your documents are verified. The evaluator is checking your eligibility next.", null);
            case "EligibilityScreening":
                return (1, "Eligibility screening", "The evaluator is checking your eligibility for the scholarship.", null);
            case "Evaluation":
                return LocateEvaluation(row);
            case "Result":
                return (5, "Awaiting the decision", "Your exam, interview and essay are scored. The Academic Head will release your scholarship result.", null);
            case "Approved":
                return (5, "Scholarship granted", "Congratulations, you are a scholarship grantee. Proceed to enrollment with the registrar's office.", null);
            case "Rejected":
                return row.ExamResult == "Failed"
                    ? (3, "Exam not passed", "You did not pass the scholarship exam. Proceed with the regular admission process.", "/applications")
                    : (5, "Not granted", "The scholarship was not granted. Proceed with the regular admission process.", "/applications");
            default:
                return (0, row.Status, string.Empty, null);
        }
    }

    private static (int Index, string Sub, string Next, string? Path) LocateEvaluation(ScholarshipPipelineRow row)
    {
        if (row.ExamResult == "Passed")
        {
            return row.Interviewed
                ? (5, "Awaiting the decision", "Your interview and essay are scored. The Academic Head will release your scholarship result.", null)
                : (4, "Qualified for interview / essay", "You passed the scholarship exam. The school will contact you about your interview and essay.", null);
        }

        if (row.ExamResult == "Failed")
        {
            return (3, "Exam not passed", "You did not pass the scholarship exam. Proceed with the regular admission process.", "/applications");
        }

        if (row.ExamStatus == "ExamDone")
        {
            return (3, "Result processing", "You took the scholarship exam. Your result will be released soon.", null);
        }

        return row.ExamScheduled
            ? (2, "Exam scheduled", "Your scholarship exam is scheduled. Open your exam permit for the date, time and venue.", "/exam-permit")
            : (2, "Waiting for your exam schedule", "You passed screening. Choose your scholarship exam schedule.", "/exam-schedule");
    }

    /// <summary>The average of whichever of the exam, interview and essay scores exist, or null when none do.</summary>
    public static decimal? TotalScore(ScholarshipPipelineRow row)
    {
        var scores = new[] { row.ExamScore, row.InterviewScore, row.EssayScore }.Where(s => s.HasValue).Select(s => s!.Value).ToList();
        return scores.Count == 0 ? null : Math.Round(scores.Average(), 2);
    }

    public static string AcademicYearOf(DateTime submittedAt)
    {
        var start = submittedAt.Month >= 6 ? submittedAt.Year : submittedAt.Year - 1;
        return $"{start}-{start + 1}";
    }
}

public class ScholarshipSummaryResponse
{
    public int TotalApplicants { get; set; }
    public int Applied { get; set; }
    public int TookExam { get; set; }
    public int Passed { get; set; }
    public int Pending { get; set; }
    public int QualifiedForInterview { get; set; }
    public int Grantees { get; set; }
}

public class ScholarshipApplicantRowResponse
{
    public Guid ApplicationId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public string ScholarshipName { get; set; } = string.Empty;
    public string? Level { get; set; }
    public string? Department { get; set; }
    public decimal GradeAverage { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Stage { get; set; } = string.Empty;
    public string SubProcess { get; set; } = string.Empty;

    /// <summary>Not yet, Scheduled, Taken, Passed or Failed.</summary>
    public string ExamStatus { get; set; } = string.Empty;

    public decimal? ExamScore { get; set; }
    public decimal? InterviewScore { get; set; }
    public decimal? EssayScore { get; set; }
    public decimal? TotalScore { get; set; }
    public bool QualifiedForInterview { get; set; }
    public bool NeedsExamResult { get; set; }
    public bool NeedsInterviewEvaluation { get; set; }
    public string AcademicYear { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
}

public class GranteeResponse
{
    public int Rank { get; set; }
    public Guid ApplicationId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ScholarshipName { get; set; } = string.Empty;
    public string? Level { get; set; }
    public string? Department { get; set; }
    public string AcademicYear { get; set; } = string.Empty;
    public decimal? TotalScore { get; set; }
    public decimal GradeAverage { get; set; }
}

public class RecordScholarshipExamResultRequest
{
    [System.ComponentModel.DataAnnotations.Required]
    public string? Result { get; set; }

    [System.ComponentModel.DataAnnotations.Range(0, 100)]
    public decimal? Score { get; set; }

    [System.ComponentModel.DataAnnotations.StringLength(500)]
    public string? Remarks { get; set; }
}

public class RecordScholarshipInterviewRequest
{
    [System.ComponentModel.DataAnnotations.Range(0, 100)]
    public decimal? InterviewScore { get; set; }

    [System.ComponentModel.DataAnnotations.Range(0, 100)]
    public decimal? EssayScore { get; set; }

    [System.ComponentModel.DataAnnotations.StringLength(500)]
    public string? Notes { get; set; }
}

public interface IScholarshipPipelineService
{
    Task<ScholarshipSummaryResponse> GetSummaryAsync(string? department, string? academicYear, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ScholarshipApplicantRowResponse>> GetApplicantsAsync(string? department, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<GranteeResponse>> GetTopGranteesAsync(string? department, string? level, string? academicYear, CancellationToken cancellationToken = default);

    Task<ScholarshipApplicantRowResponse> RecordExamResultAsync(Guid applicationId, RecordScholarshipExamResultRequest request, Guid recordedByUserId, CancellationToken cancellationToken = default);

    Task<ScholarshipApplicantRowResponse> RecordInterviewAsync(Guid applicationId, RecordScholarshipInterviewRequest request, Guid evaluatedByUserId, CancellationToken cancellationToken = default);

    /// <summary>The applicant's own scholarship applications on the six-stage tracker.</summary>
    Task<IReadOnlyList<(ScholarshipPipelineRow Row, ScholarshipProgress Progress)>> GetMyProgressAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>Tracker steps for any scholarship application (used by the admin list).</summary>
    Task<IReadOnlyDictionary<Guid, ScholarshipProgress>> GetProgressByApplicationAsync(IEnumerable<Guid> applicationIds, CancellationToken cancellationToken = default);
}

public class ScholarshipPipelineService : IScholarshipPipelineService
{
    private const string RowSelect = @"
SELECT sa.ApplicationId, sa.UserId, u.FirstName, u.LastName, u.Email, sc.Name AS ScholarshipName, sa.LevelApplied,
       ad.Department, sa.GradeAverage, sa.Status, sa.SubmittedAt,
       scr.Verdict,
       sel.ExamScheduleSelectionId, sel.ExamStatus,
       er.Result AS ExamResult, er.Score AS ExamScore, er.Remarks AS ExamRemarks,
       ie.ApplicationId AS InterviewId, ie.InterviewScore, ie.EssayScore, ie.Notes AS InterviewNotes
FROM dbo.ScholarshipApplications sa
JOIN dbo.Users u ON u.UserId = sa.UserId
JOIN dbo.Scholarships sc ON sc.ScholarshipId = sa.ScholarshipId
LEFT JOIN dbo.vw_ApplicantDepartments ad ON ad.UserId = sa.UserId
LEFT JOIN dbo.ScholarshipEligibilityScreenings scr ON scr.ApplicationId = sa.ApplicationId
LEFT JOIN dbo.ExamScheduleSelections sel ON sel.UserId = sa.UserId AND sel.ExamType = N'Scholarship Exam'
LEFT JOIN dbo.ScholarshipExamResults er ON er.ApplicationId = sa.ApplicationId
LEFT JOIN dbo.ScholarshipInterviewEvaluations ie ON ie.ApplicationId = sa.ApplicationId";

    private readonly IDbConnectionFactory _connectionFactory;
    private readonly IAdminApplicationsService _applicationsService;
    private readonly IUserRepository _userRepository;
    private readonly INotificationDispatchService _notifications;
    private readonly ILogger<ScholarshipPipelineService> _logger;

    public ScholarshipPipelineService(
        IDbConnectionFactory connectionFactory,
        IAdminApplicationsService applicationsService,
        IUserRepository userRepository,
        INotificationDispatchService notifications,
        ILogger<ScholarshipPipelineService> logger)
    {
        _connectionFactory = connectionFactory;
        _applicationsService = applicationsService;
        _userRepository = userRepository;
        _notifications = notifications;
        _logger = logger;
    }

    public async Task<ScholarshipSummaryResponse> GetSummaryAsync(string? department, string? academicYear, CancellationToken cancellationToken = default)
    {
        var rows = (await LoadAsync(department, null, cancellationToken))
            .Where(r => academicYear is null || ScholarshipTracker.AcademicYearOf(r.SubmittedAt) == academicYear)
            .ToList();

        return new ScholarshipSummaryResponse
        {
            TotalApplicants = rows.Select(r => r.UserId).Distinct().Count(),
            Applied = rows.Count,
            TookExam = rows.Count(r => r.ExamResult is not null || r.ExamStatus == "ExamDone"),
            Passed = rows.Count(r => r.ExamResult == "Passed"),
            Pending = rows.Count(r => r.Status is not ("Approved" or "Rejected")),
            QualifiedForInterview = rows.Count(r => r.ExamResult == "Passed" && r.Status != "Rejected"),
            Grantees = rows.Count(r => r.Status == "Approved"),
        };
    }

    public async Task<IReadOnlyList<ScholarshipApplicantRowResponse>> GetApplicantsAsync(string? department, CancellationToken cancellationToken = default) =>
        (await LoadAsync(department, null, cancellationToken)).Select(ToApplicantRow).ToList();

    public async Task<IReadOnlyList<GranteeResponse>> GetTopGranteesAsync(
        string? department, string? level, string? academicYear, CancellationToken cancellationToken = default)
    {
        var rows = (await LoadAsync(department, null, cancellationToken))
            .Where(r => r.Status == "Approved")
            .Where(r => string.IsNullOrWhiteSpace(level) || r.Level == level)
            .Where(r => string.IsNullOrWhiteSpace(academicYear) || ScholarshipTracker.AcademicYearOf(r.SubmittedAt) == academicYear)
            .OrderByDescending(r => ScholarshipTracker.TotalScore(r) ?? 0)
            .ThenByDescending(r => r.GradeAverage)
            .Take(10)
            .ToList();

        return rows
            .Select((r, i) => new GranteeResponse
            {
                Rank = i + 1,
                ApplicationId = r.ApplicationId,
                ApplicantName = r.ApplicantName,
                ScholarshipName = r.ScholarshipName,
                Level = r.Level,
                Department = r.Department,
                AcademicYear = ScholarshipTracker.AcademicYearOf(r.SubmittedAt),
                TotalScore = ScholarshipTracker.TotalScore(r),
                GradeAverage = r.GradeAverage,
            })
            .ToList();
    }

    public async Task<ScholarshipApplicantRowResponse> RecordExamResultAsync(
        Guid applicationId, RecordScholarshipExamResultRequest request, Guid recordedByUserId, CancellationToken cancellationToken = default)
    {
        var result = request.Result?.Trim() ?? string.Empty;
        if (result is not ("Passed" or "Failed"))
        {
            throw new AdmissionStepException("The scholarship exam result must be Passed or Failed.");
        }

        var row = await GetRowAsync(applicationId, cancellationToken) ?? throw new ApplicationNotFoundException(applicationId);
        if (row.Status != "Evaluation")
        {
            throw new AdmissionStepException("A scholarship exam result can only be recorded once the application has passed screening and is in Evaluation.");
        }

        var remarks = string.IsNullOrWhiteSpace(request.Remarks) ? null : request.Remarks.Trim();
        await using (var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken))
        {
            const string sql = @"
MERGE dbo.ScholarshipExamResults WITH (HOLDLOCK) AS target
USING (SELECT @ApplicationId AS ApplicationId) AS source
ON target.ApplicationId = source.ApplicationId
WHEN MATCHED THEN UPDATE SET Result = @Result, Score = @Score, Remarks = @Remarks, RecordedByUserId = @By, RecordedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (ApplicationId, Result, Score, Remarks, RecordedByUserId) VALUES (@ApplicationId, @Result, @Score, @Remarks, @By);";

            await using var command = new SqlCommand(sql, connection);
            command.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = applicationId });
            command.Parameters.Add(new SqlParameter("@Result", SqlDbType.NVarChar, 10) { Value = result });
            command.Parameters.Add(new SqlParameter("@Score", SqlDbType.Decimal) { Precision = 5, Scale = 2, Value = (object?)request.Score ?? DBNull.Value });
            command.Parameters.Add(new SqlParameter("@Remarks", SqlDbType.NVarChar, 500) { Value = (object?)remarks ?? DBNull.Value });
            command.Parameters.Add(new SqlParameter("@By", SqlDbType.UniqueIdentifier) { Value = recordedByUserId });
            await command.ExecuteNonQueryAsync(cancellationToken);
        }

        // A failed exam closes the scholarship and points the applicant to regular admission.
        if (result == "Failed")
        {
            await _applicationsService.UpdateStatusAsync(
                applicationId,
                new UpdateApplicationStatusRequest
                {
                    Category = "Scholarship",
                    Status = "Rejected",
                    Remarks = "Scholarship exam not passed. Proceed with the regular admission process.",
                    SuppressNotification = true,
                },
                recordedByUserId,
                cancellationToken);
        }

        var applicant = await _userRepository.GetByIdAsync(row.UserId, cancellationToken);
        if (applicant is not null)
        {
            await _notifications.NotifyScholarshipExamResultAsync(
                row.UserId, applicant.Email, applicant.FirstName, result == "Passed", row.ScholarshipName, cancellationToken);
        }

        _logger.LogInformation("Scholarship exam {Result} recorded for {ApplicationId} by {UserId}", result, applicationId, recordedByUserId);
        return ToApplicantRow((await GetRowAsync(applicationId, cancellationToken))!);
    }

    public async Task<ScholarshipApplicantRowResponse> RecordInterviewAsync(
        Guid applicationId, RecordScholarshipInterviewRequest request, Guid evaluatedByUserId, CancellationToken cancellationToken = default)
    {
        if (request.InterviewScore is null && request.EssayScore is null)
        {
            throw new AdmissionStepException("Enter the interview score, the essay score, or both.");
        }

        var row = await GetRowAsync(applicationId, cancellationToken) ?? throw new ApplicationNotFoundException(applicationId);
        if (row.ExamResult != "Passed" || row.Status != "Evaluation")
        {
            throw new AdmissionStepException("Only an applicant who passed the scholarship exam can be scored for the interview and essay.");
        }

        var notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
        await using (var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken))
        {
            const string sql = @"
MERGE dbo.ScholarshipInterviewEvaluations WITH (HOLDLOCK) AS target
USING (SELECT @ApplicationId AS ApplicationId) AS source
ON target.ApplicationId = source.ApplicationId
WHEN MATCHED THEN UPDATE SET InterviewScore = @Interview, EssayScore = @Essay, Notes = @Notes, EvaluatedByUserId = @By, EvaluatedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (ApplicationId, InterviewScore, EssayScore, Notes, EvaluatedByUserId) VALUES (@ApplicationId, @Interview, @Essay, @Notes, @By);";

            await using var command = new SqlCommand(sql, connection);
            command.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = applicationId });
            command.Parameters.Add(new SqlParameter("@Interview", SqlDbType.Decimal) { Precision = 5, Scale = 2, Value = (object?)request.InterviewScore ?? DBNull.Value });
            command.Parameters.Add(new SqlParameter("@Essay", SqlDbType.Decimal) { Precision = 5, Scale = 2, Value = (object?)request.EssayScore ?? DBNull.Value });
            command.Parameters.Add(new SqlParameter("@Notes", SqlDbType.NVarChar, 500) { Value = (object?)notes ?? DBNull.Value });
            command.Parameters.Add(new SqlParameter("@By", SqlDbType.UniqueIdentifier) { Value = evaluatedByUserId });
            await command.ExecuteNonQueryAsync(cancellationToken);
        }

        // Scored: the application is ready for the Academic Head's scholarship result.
        await _applicationsService.UpdateStatusAsync(
            applicationId,
            new UpdateApplicationStatusRequest { Category = "Scholarship", Status = "Result", Remarks = "Interview and essay scored", SuppressNotification = true },
            evaluatedByUserId,
            cancellationToken);

        _logger.LogInformation("Scholarship interview/essay recorded for {ApplicationId} by {UserId}", applicationId, evaluatedByUserId);
        return ToApplicantRow((await GetRowAsync(applicationId, cancellationToken))!);
    }

    public async Task<IReadOnlyList<(ScholarshipPipelineRow Row, ScholarshipProgress Progress)>> GetMyProgressAsync(
        Guid userId, CancellationToken cancellationToken = default) =>
        (await LoadAsync(null, userId, cancellationToken)).Select(r => (r, ScholarshipTracker.Build(r))).ToList();

    public async Task<IReadOnlyDictionary<Guid, ScholarshipProgress>> GetProgressByApplicationAsync(
        IEnumerable<Guid> applicationIds, CancellationToken cancellationToken = default)
    {
        var wanted = applicationIds.ToHashSet();
        if (wanted.Count == 0)
        {
            return new Dictionary<Guid, ScholarshipProgress>();
        }

        return (await LoadAsync(null, null, cancellationToken))
            .Where(r => wanted.Contains(r.ApplicationId))
            .ToDictionary(r => r.ApplicationId, ScholarshipTracker.Build);
    }

    private async Task<ScholarshipPipelineRow?> GetRowAsync(Guid applicationId, CancellationToken cancellationToken) =>
        (await LoadAsync(null, null, cancellationToken, applicationId)).FirstOrDefault();

    private async Task<List<ScholarshipPipelineRow>> LoadAsync(
        string? department, Guid? userId, CancellationToken cancellationToken, Guid? applicationId = null)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        var sql = RowSelect + @"
WHERE sa.IsArchived = 0
  AND (@Department IS NULL OR ad.Department = @Department)
  AND (@UserId IS NULL OR sa.UserId = @UserId)
  AND (@ApplicationId IS NULL OR sa.ApplicationId = @ApplicationId)
ORDER BY sa.SubmittedAt DESC;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Department", SqlDbType.NVarChar, 100) { Value = (object?)department ?? DBNull.Value });
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = (object?)userId ?? DBNull.Value });
        command.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = (object?)applicationId ?? DBNull.Value });
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var rows = new List<ScholarshipPipelineRow>();
        while (await reader.ReadAsync(cancellationToken))
        {
            string? Text(string c) => reader.IsDBNull(reader.GetOrdinal(c)) ? null : reader.GetString(reader.GetOrdinal(c));
            decimal? Number(string c) => reader.IsDBNull(reader.GetOrdinal(c)) ? null : reader.GetDecimal(reader.GetOrdinal(c));

            rows.Add(new ScholarshipPipelineRow
            {
                ApplicationId = reader.GetGuid(reader.GetOrdinal("ApplicationId")),
                UserId = reader.GetGuid(reader.GetOrdinal("UserId")),
                ApplicantName = $"{reader.GetString(reader.GetOrdinal("FirstName"))} {reader.GetString(reader.GetOrdinal("LastName"))}",
                ApplicantEmail = reader.GetString(reader.GetOrdinal("Email")),
                ScholarshipName = reader.GetString(reader.GetOrdinal("ScholarshipName")),
                Level = Text("LevelApplied"),
                Department = Text("Department"),
                GradeAverage = reader.GetDecimal(reader.GetOrdinal("GradeAverage")),
                Status = reader.GetString(reader.GetOrdinal("Status")),
                SubmittedAt = reader.GetDateTime(reader.GetOrdinal("SubmittedAt")),
                Verdict = Text("Verdict"),
                ExamScheduled = !reader.IsDBNull(reader.GetOrdinal("ExamScheduleSelectionId")),
                ExamStatus = Text("ExamStatus"),
                ExamResult = Text("ExamResult"),
                ExamScore = Number("ExamScore"),
                ExamRemarks = Text("ExamRemarks"),
                InterviewScore = Number("InterviewScore"),
                EssayScore = Number("EssayScore"),
                InterviewNotes = Text("InterviewNotes"),
                Interviewed = !reader.IsDBNull(reader.GetOrdinal("InterviewId")),
            });
        }

        return rows;
    }

    private static ScholarshipApplicantRowResponse ToApplicantRow(ScholarshipPipelineRow r)
    {
        var progress = ScholarshipTracker.Build(r);
        var examStatus = r.ExamResult ?? (r.ExamStatus == "ExamDone" ? "Taken" : r.ExamScheduled ? "Scheduled" : "Not yet");

        return new ScholarshipApplicantRowResponse
        {
            ApplicationId = r.ApplicationId,
            ApplicantName = r.ApplicantName,
            ApplicantEmail = r.ApplicantEmail,
            ScholarshipName = r.ScholarshipName,
            Level = r.Level,
            Department = r.Department,
            GradeAverage = r.GradeAverage,
            Status = r.Status,
            Stage = ScholarshipTracker.Stages[progress.StageIndex],
            SubProcess = progress.SubProcess,
            ExamStatus = examStatus,
            ExamScore = r.ExamScore,
            InterviewScore = r.InterviewScore,
            EssayScore = r.EssayScore,
            TotalScore = ScholarshipTracker.TotalScore(r),
            QualifiedForInterview = r.ExamResult == "Passed" && r.Status != "Rejected",
            NeedsExamResult = r.Status == "Evaluation" && r.ExamResult is null,
            NeedsInterviewEvaluation = r.Status == "Evaluation" && r.ExamResult == "Passed",
            AcademicYear = ScholarshipTracker.AcademicYearOf(r.SubmittedAt),
            SubmittedAt = r.SubmittedAt,
        };
    }
}
