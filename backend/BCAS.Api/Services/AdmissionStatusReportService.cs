using System.Data;
using BCAS.Api.Constants;
using BCAS.Api.Data;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Services;

public class AdmissionStatusReportFilter
{
    public DateOnly? DateFrom { get; set; }
    public DateOnly? DateTo { get; set; }
    public string? AcademicYear { get; set; }
    public string? Department { get; set; }
    public string? YearLevel { get; set; }

    /// <summary>The program (College), strand (Senior High School) or grade level, as stored in CourseAppliedFor.</summary>
    public string? Program { get; set; }
}

public class AdmissionStatusReportResponse
{
    public ExamCounts Exam { get; set; } = new();
    public InterviewCounts Interview { get; set; } = new();
    public EnrollmentCounts Enrollment { get; set; } = new();
    public int Total { get; set; }
    public IReadOnlyList<AdmissionStatusRow> Rows { get; set; } = Array.Empty<AdmissionStatusRow>();
}

public class ExamCounts
{
    public int Pending { get; set; }
    public int Scheduled { get; set; }
    public int Completed { get; set; }
    public int Passed { get; set; }
    public int Failed { get; set; }
    public int Retake { get; set; }
}

public class InterviewCounts
{
    public int Pending { get; set; }
    public int Scheduled { get; set; }
    public int Completed { get; set; }
}

public class EnrollmentCounts
{
    public int Pending { get; set; }
    public int ForEnrollment { get; set; }
    public int Enrolled { get; set; }
}

public class AdmissionStatusRow
{
    public Guid ApplicationId { get; set; }
    public string ApplicationNumber { get; set; } = string.Empty;
    public string ApplicantName { get; set; } = string.Empty;
    public string? Department { get; set; }
    public string? YearLevel { get; set; }
    public string CourseAppliedFor { get; set; } = string.Empty;
    public string AcademicYear { get; set; } = string.Empty;
    public string ApplicationStatus { get; set; } = string.Empty;

    /// <summary>Pending, Scheduled, Completed, Passed, Failed or Retake.</summary>
    public string Exam { get; set; } = string.Empty;

    /// <summary>Pending, Scheduled, Completed, or empty before the interview stage.</summary>
    public string Interview { get; set; } = string.Empty;

    /// <summary>Pending, ForEnrollment, Enrolled, or empty when the applicant isn't heading to enrollment.</summary>
    public string Enrollment { get; set; } = string.Empty;

    public DateTime SubmittedAt { get; set; }
}

public interface IAdmissionStatusReportService
{
    Task<AdmissionStatusReportResponse> GetAsync(AdmissionStatusReportFilter filter, CancellationToken cancellationToken = default);
}

/// <summary>
/// Admission results and applicant status: where each applicant stands in the
/// exam, the interview and enrollment, filtered by date, academic year, level
/// and program.
/// </summary>
public class AdmissionStatusReportService : IAdmissionStatusReportService
{
    private const int MaxRows = 2000;

    private readonly IDbConnectionFactory _connectionFactory;

    public AdmissionStatusReportService(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<AdmissionStatusReportResponse> GetAsync(AdmissionStatusReportFilter filter, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT TOP (@MaxRows)
       a.ApplicationId, a.ApplicationSeq, u.FirstName, u.LastName, a.Department, a.YearLevel, a.CourseAppliedFor, a.Status, a.SubmittedAt,
       COALESCE(a.AcademicYear,
                CASE WHEN MONTH(a.SubmittedAt) >= 6 THEN CONCAT(YEAR(a.SubmittedAt), N'-', YEAR(a.SubmittedAt) + 1)
                     ELSE CONCAT(YEAR(a.SubmittedAt) - 1, N'-', YEAR(a.SubmittedAt)) END) AS AY,
       r.Result AS LastResult,
       i.InterviewId, i.Evaluation,
       CASE WHEN rs.ApplicationId IS NULL THEN 0 ELSE 1 END AS IsReserved
FROM dbo.AdmissionApplications a
JOIN dbo.Users u ON u.UserId = a.UserId
OUTER APPLY (SELECT TOP (1) x.Result FROM dbo.ExamResults x WHERE x.ApplicationId = a.ApplicationId ORDER BY x.Attempt DESC) r
LEFT JOIN dbo.InterviewSchedules i ON i.ApplicationId = a.ApplicationId
LEFT JOIN dbo.AdmissionReservations rs ON rs.ApplicationId = a.ApplicationId AND rs.IsReserved = 1
WHERE a.IsArchived = 0
  AND (@DateFrom IS NULL OR a.SubmittedAt >= @DateFrom)
  AND (@DateTo IS NULL OR a.SubmittedAt < DATEADD(DAY, 1, @DateTo))
  AND (@Department IS NULL OR a.Department = @Department)
  AND (@YearLevel IS NULL OR a.YearLevel = @YearLevel)
  AND (@Program IS NULL OR a.CourseAppliedFor = @Program)
ORDER BY a.SubmittedAt DESC;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@MaxRows", SqlDbType.Int) { Value = MaxRows });
        command.Parameters.Add(new SqlParameter("@DateFrom", SqlDbType.Date) { Value = filter.DateFrom is null ? DBNull.Value : filter.DateFrom.Value.ToDateTime(TimeOnly.MinValue) });
        command.Parameters.Add(new SqlParameter("@DateTo", SqlDbType.Date) { Value = filter.DateTo is null ? DBNull.Value : filter.DateTo.Value.ToDateTime(TimeOnly.MinValue) });
        command.Parameters.Add(new SqlParameter("@Department", SqlDbType.NVarChar, 100) { Value = (object?)Clean(filter.Department) ?? DBNull.Value });
        command.Parameters.Add(new SqlParameter("@YearLevel", SqlDbType.NVarChar, 40) { Value = (object?)Clean(filter.YearLevel) ?? DBNull.Value });
        command.Parameters.Add(new SqlParameter("@Program", SqlDbType.NVarChar, 200) { Value = (object?)Clean(filter.Program) ?? DBNull.Value });

        var rows = new List<AdmissionStatusRow>();
        var academicYear = Clean(filter.AcademicYear);

        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                var year = reader.GetString(reader.GetOrdinal("AY"));
                if (academicYear is not null && year != academicYear)
                {
                    continue;
                }

                var status = reader.GetString(reader.GetOrdinal("Status"));
                var lastResult = reader.IsDBNull(reader.GetOrdinal("LastResult")) ? null : reader.GetString(reader.GetOrdinal("LastResult"));
                var hasInterview = !reader.IsDBNull(reader.GetOrdinal("InterviewId"));
                var evaluated = !reader.IsDBNull(reader.GetOrdinal("Evaluation"));
                var reserved = reader.GetInt32(reader.GetOrdinal("IsReserved")) == 1;
                var submittedAt = reader.GetDateTime(reader.GetOrdinal("SubmittedAt"));

                rows.Add(new AdmissionStatusRow
                {
                    ApplicationId = reader.GetGuid(reader.GetOrdinal("ApplicationId")),
                    ApplicationNumber = ApplicationNumbers.Format(reader.GetInt32(reader.GetOrdinal("ApplicationSeq")), submittedAt),
                    ApplicantName = $"{reader.GetString(reader.GetOrdinal("FirstName"))} {reader.GetString(reader.GetOrdinal("LastName"))}",
                    Department = reader.IsDBNull(reader.GetOrdinal("Department")) ? null : reader.GetString(reader.GetOrdinal("Department")),
                    YearLevel = reader.IsDBNull(reader.GetOrdinal("YearLevel")) ? null : reader.GetString(reader.GetOrdinal("YearLevel")),
                    CourseAppliedFor = reader.GetString(reader.GetOrdinal("CourseAppliedFor")),
                    AcademicYear = year,
                    ApplicationStatus = status,
                    Exam = ExamStage(status, lastResult),
                    Interview = InterviewStage(status, hasInterview, evaluated),
                    Enrollment = EnrollmentStage(status, reserved),
                    SubmittedAt = submittedAt,
                });
            }
        }

        var response = new AdmissionStatusReportResponse { Rows = rows, Total = rows.Count };
        foreach (var row in rows)
        {
            switch (row.Exam)
            {
                case "Pending": response.Exam.Pending++; break;
                case "Scheduled": response.Exam.Scheduled++; break;
                case "Completed": response.Exam.Completed++; break;
                case "Passed": response.Exam.Passed++; break;
                case "Failed": response.Exam.Failed++; break;
                case "Retake": response.Exam.Retake++; break;
            }

            switch (row.Interview)
            {
                case "Pending": response.Interview.Pending++; break;
                case "Scheduled": response.Interview.Scheduled++; break;
                case "Completed": response.Interview.Completed++; break;
            }

            switch (row.Enrollment)
            {
                case "Pending": response.Enrollment.Pending++; break;
                case "ForEnrollment": response.Enrollment.ForEnrollment++; break;
                case "Enrolled": response.Enrollment.Enrolled++; break;
            }
        }

        return response;
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    /// <summary>Where the applicant is in the exam. Older approvals with no recorded result count as passed.</summary>
    private static string ExamStage(string status, string? lastResult)
    {
        if (status == "ExamDone") return "Completed";
        if (lastResult is not null) return lastResult;
        return status switch
        {
            "ExamScheduled" => "Scheduled",
            "Registration" or "Approved" => "Passed",
            "Rejected" or "Retracted" => string.Empty,
            _ => "Pending",
        };
    }

    private static string InterviewStage(string status, bool hasInterview, bool evaluated)
    {
        if (evaluated) return "Completed";
        if (hasInterview) return "Scheduled";
        return status == "Registration" ? "Pending" : string.Empty;
    }

    private static string EnrollmentStage(string status, bool reserved) => status switch
    {
        "Approved" => reserved ? "Enrolled" : "ForEnrollment",
        "Registration" => "Pending",
        _ => string.Empty,
    };
}
