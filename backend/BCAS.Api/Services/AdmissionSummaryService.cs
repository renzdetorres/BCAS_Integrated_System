using System.Data;
using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Services;

public class AdmissionSummaryResponse
{
    /// <summary>The year the counts are for, or empty for all years.</summary>
    public string AcademicYear { get; set; } = string.Empty;

    /// <summary>The five academic years the trend covers, oldest first.</summary>
    public IReadOnlyList<string> AcademicYears { get; set; } = Array.Empty<string>();

    public int TotalApplicants { get; set; }
    public int Pending { get; set; }
    public int UnderReview { get; set; }
    public int ForExam { get; set; }
    public int ForInterview { get; set; }
    public int Passed { get; set; }
    public int Failed { get; set; }
    public int Retake { get; set; }
    public int Enrolled { get; set; }

    public IReadOnlyList<AdmissionTrendPoint> Trend { get; set; } = Array.Empty<AdmissionTrendPoint>();
    public IReadOnlyList<CollegeSemesterPoint> CollegeTrend { get; set; } = Array.Empty<CollegeSemesterPoint>();
    public IReadOnlyList<LatestApplicantResponse> Latest { get; set; } = Array.Empty<LatestApplicantResponse>();
}

public class AdmissionTrendPoint
{
    public string AcademicYear { get; set; } = string.Empty;
    public int Applicants { get; set; }
    public int Enrolled { get; set; }
}

public class CollegeSemesterPoint
{
    public string AcademicYear { get; set; } = string.Empty;
    public string Semester { get; set; } = string.Empty;
    public int Applicants { get; set; }
}

public class LatestApplicantResponse
{
    public Guid ApplicationId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicationNumber { get; set; } = string.Empty;
    public string? Department { get; set; }
    public string? YearLevel { get; set; }
    public string CourseAppliedFor { get; set; } = string.Empty;
    public string ApplicationType { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
    public string Status { get; set; } = string.Empty;
}

public interface IAdmissionSummaryService
{
    /// <summary>The admission dashboard figures and five-year trend; department-scoped for an Academic Head.</summary>
    Task<AdmissionSummaryResponse> GetAsync(string? department, string? academicYear, CancellationToken cancellationToken = default);
}

public class AdmissionSummaryService : IAdmissionSummaryService
{
    private const string AppCte = @"
WITH app AS (
    SELECT a.ApplicationId, a.UserId, a.Status, a.Department, a.YearLevel, a.AcademicTerm, a.CourseAppliedFor,
           a.ApplicationType, a.SubmittedAt, a.ApplicationSeq,
           COALESCE(a.AcademicYear,
                    CASE WHEN MONTH(a.SubmittedAt) >= 6 THEN CONCAT(YEAR(a.SubmittedAt), N'-', YEAR(a.SubmittedAt) + 1)
                         ELSE CONCAT(YEAR(a.SubmittedAt) - 1, N'-', YEAR(a.SubmittedAt)) END) AS AY,
           r.Result AS LastResult,
           CASE WHEN rs.ApplicationId IS NULL THEN 0 ELSE 1 END AS IsReserved
    FROM dbo.AdmissionApplications a
    LEFT JOIN dbo.AdmissionReservations rs ON rs.ApplicationId = a.ApplicationId AND rs.IsReserved = 1
    OUTER APPLY (
        SELECT TOP (1) x.Result FROM dbo.ExamResults x WHERE x.ApplicationId = a.ApplicationId ORDER BY x.Attempt DESC
    ) r
    WHERE a.IsArchived = 0 AND (@Department IS NULL OR a.Department = @Department)
)";

    private readonly IDbConnectionFactory _connectionFactory;
    private readonly ISchoolConfigService _schoolConfig;

    public AdmissionSummaryService(IDbConnectionFactory connectionFactory, ISchoolConfigService schoolConfig)
    {
        _connectionFactory = connectionFactory;
        _schoolConfig = schoolConfig;
    }

    public async Task<AdmissionSummaryResponse> GetAsync(string? department, string? academicYear, CancellationToken cancellationToken = default)
    {
        var config = await _schoolConfig.GetAdmissionConfigAsync(DateOnly.FromDateTime(DateTime.UtcNow), cancellationToken);
        var currentStart = config.AgeCutoffYear;
        var years = Enumerable.Range(currentStart - 4, 5).Select(y => $"{y}-{y + 1}").ToList();
        var selected = academicYear is not null && years.Contains(academicYear) ? academicYear : null;

        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        var response = new AdmissionSummaryResponse { AcademicYear = selected ?? string.Empty, AcademicYears = years };

        // ---- Counts
        var countsSql = AppCte + @"
SELECT COUNT(DISTINCT UserId) AS TotalApplicants,
       SUM(CASE WHEN Status = N'Submitted' THEN 1 ELSE 0 END) AS Pending,
       SUM(CASE WHEN Status IN (N'UnderReview', N'PendingDocuments', N'DocumentsCompleted') THEN 1 ELSE 0 END) AS UnderReview,
       SUM(CASE WHEN Status IN (N'DocumentsCleared', N'ExamScheduled', N'ExamDone', N'DidNotTakeExam') THEN 1 ELSE 0 END) AS ForExam,
       SUM(CASE WHEN Status = N'Registration' THEN 1 ELSE 0 END) AS ForInterview,
       SUM(CASE WHEN LastResult = N'Passed' THEN 1 ELSE 0 END) AS Passed,
       SUM(CASE WHEN LastResult = N'Failed' THEN 1 ELSE 0 END) AS Failed,
       SUM(CASE WHEN LastResult = N'Retake' THEN 1 ELSE 0 END) AS Retake,
       SUM(CASE WHEN Status = N'Approved' AND IsReserved = 1 THEN 1 ELSE 0 END) AS Enrolled
FROM app
WHERE @AcademicYear IS NULL OR AY = @AcademicYear;";

        await using (var command = Command(countsSql, connection, department, selected))
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            if (await reader.ReadAsync(cancellationToken))
            {
                int Number(string column) => reader.IsDBNull(reader.GetOrdinal(column)) ? 0 : reader.GetInt32(reader.GetOrdinal(column));
                response.TotalApplicants = Number("TotalApplicants");
                response.Pending = Number("Pending");
                response.UnderReview = Number("UnderReview");
                response.ForExam = Number("ForExam");
                response.ForInterview = Number("ForInterview");
                response.Passed = Number("Passed");
                response.Failed = Number("Failed");
                response.Retake = Number("Retake");
                response.Enrolled = Number("Enrolled");
            }
        }

        // ---- Five-year trend (zero-filled)
        var trendSql = AppCte + @"
SELECT AY, COUNT(*) AS Applicants, SUM(CASE WHEN Status = N'Approved' AND IsReserved = 1 THEN 1 ELSE 0 END) AS Enrolled
FROM app
WHERE AY IN (SELECT value FROM STRING_SPLIT(@Years, N','))
GROUP BY AY;";

        var byYear = new Dictionary<string, AdmissionTrendPoint>(StringComparer.Ordinal);
        await using (var command = Command(trendSql, connection, department, null))
        {
            command.Parameters.Add(new SqlParameter("@Years", SqlDbType.NVarChar, 200) { Value = string.Join(',', years) });
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var year = reader.GetString(0);
                byYear[year] = new AdmissionTrendPoint { AcademicYear = year, Applicants = reader.GetInt32(1), Enrolled = reader.GetInt32(2) };
            }
        }

        response.Trend = years.Select(y => byYear.TryGetValue(y, out var point) ? point : new AdmissionTrendPoint { AcademicYear = y }).ToList();

        // ---- College, by academic year and semester
        var collegeSql = AppCte + @"
SELECT AY, ISNULL(AcademicTerm, N'Not specified') AS Semester, COUNT(*) AS Applicants
FROM app
WHERE Department = N'College' AND AY IN (SELECT value FROM STRING_SPLIT(@Years, N','))
GROUP BY AY, ISNULL(AcademicTerm, N'Not specified');";

        var college = new List<CollegeSemesterPoint>();
        await using (var command = Command(collegeSql, connection, department, null))
        {
            command.Parameters.Add(new SqlParameter("@Years", SqlDbType.NVarChar, 200) { Value = string.Join(',', years) });
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                college.Add(new CollegeSemesterPoint { AcademicYear = reader.GetString(0), Semester = reader.GetString(1), Applicants = reader.GetInt32(2) });
            }
        }

        response.CollegeTrend = college.OrderBy(c => c.AcademicYear).ThenBy(c => c.Semester).ToList();

        // ---- Latest applicants
        var latestSql = AppCte + @"
SELECT TOP (8) app.ApplicationId, u.FirstName, u.LastName, app.ApplicationSeq, app.Department, app.YearLevel, app.CourseAppliedFor,
       app.ApplicationType, app.SubmittedAt, app.Status
FROM app
JOIN dbo.AdmissionApplications a ON a.ApplicationId = app.ApplicationId
JOIN dbo.Users u ON u.UserId = a.UserId
WHERE @AcademicYear IS NULL OR app.AY = @AcademicYear
ORDER BY app.SubmittedAt DESC;";

        var latest = new List<LatestApplicantResponse>();
        await using (var command = Command(latestSql, connection, department, selected))
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                var submittedAt = reader.GetDateTime(reader.GetOrdinal("SubmittedAt"));
                latest.Add(new LatestApplicantResponse
                {
                    ApplicationId = reader.GetGuid(reader.GetOrdinal("ApplicationId")),
                    ApplicantName = $"{reader.GetString(reader.GetOrdinal("FirstName"))} {reader.GetString(reader.GetOrdinal("LastName"))}",
                    ApplicationNumber = ApplicationNumbers.Format(reader.GetInt32(reader.GetOrdinal("ApplicationSeq")), submittedAt),
                    Department = reader.IsDBNull(reader.GetOrdinal("Department")) ? null : reader.GetString(reader.GetOrdinal("Department")),
                    YearLevel = reader.IsDBNull(reader.GetOrdinal("YearLevel")) ? null : reader.GetString(reader.GetOrdinal("YearLevel")),
                    CourseAppliedFor = reader.GetString(reader.GetOrdinal("CourseAppliedFor")),
                    ApplicationType = reader.GetString(reader.GetOrdinal("ApplicationType")),
                    SubmittedAt = submittedAt,
                    Status = reader.GetString(reader.GetOrdinal("Status")),
                });
            }
        }

        response.Latest = latest;
        return response;
    }

    private static SqlCommand Command(string sql, SqlConnection connection, string? department, string? academicYear)
    {
        var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Department", SqlDbType.NVarChar, 100) { Value = (object?)department ?? DBNull.Value });
        if (sql.Contains("@AcademicYear", StringComparison.Ordinal))
        {
            command.Parameters.Add(new SqlParameter("@AcademicYear", SqlDbType.NVarChar, 9) { Value = (object?)academicYear ?? DBNull.Value });
        }

        return command;
    }
}
