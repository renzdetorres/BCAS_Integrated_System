using System.Data;
using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class AdminReportsRepository : IAdminReportsRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public AdminReportsRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<EnrollmentListItem>> GetEnrollmentListAsync(
        string? program, string? applicationType, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT
    a.ApplicationId, a.UserId, u.FirstName, u.LastName, u.Email,
    a.ApplicationType, a.CourseAppliedFor, a.PreviousSchool, a.SubmittedAt,
    r.ReservationFee, r.RecordedAt AS ReservedAt
FROM dbo.AdmissionApplications a
JOIN dbo.Users u ON u.UserId = a.UserId
JOIN dbo.AdmissionReservations r ON r.ApplicationId = a.ApplicationId
WHERE a.Status = N'Approved' AND r.IsReserved = 1
  AND (@Program IS NULL OR a.CourseAppliedFor LIKE '%' + @Program + '%')
  AND (@ApplicationType IS NULL OR a.ApplicationType = @ApplicationType)
ORDER BY a.CourseAppliedFor ASC, u.LastName ASC, u.FirstName ASC;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Program", SqlDbType.NVarChar, 200) { Value = (object?)NullIfEmpty(program) ?? DBNull.Value });
        command.Parameters.Add(new SqlParameter("@ApplicationType", SqlDbType.NVarChar, 20) { Value = (object?)NullIfEmpty(applicationType) ?? DBNull.Value });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var items = new List<EnrollmentListItem>();
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(new EnrollmentListItem
            {
                ApplicationId = reader.GetGuid(reader.GetOrdinal("ApplicationId")),
                UserId = reader.GetGuid(reader.GetOrdinal("UserId")),
                ApplicantName = $"{reader.GetString(reader.GetOrdinal("FirstName"))} {reader.GetString(reader.GetOrdinal("LastName"))}",
                ApplicantEmail = reader.GetString(reader.GetOrdinal("Email")),
                ApplicationType = reader.GetString(reader.GetOrdinal("ApplicationType")),
                CourseAppliedFor = reader.GetString(reader.GetOrdinal("CourseAppliedFor")),
                PreviousSchool = reader.IsDBNull(reader.GetOrdinal("PreviousSchool")) ? null : reader.GetString(reader.GetOrdinal("PreviousSchool")),
                SubmittedAt = reader.GetDateTime(reader.GetOrdinal("SubmittedAt")),
                ReservationFee = reader.IsDBNull(reader.GetOrdinal("ReservationFee")) ? null : reader.GetDecimal(reader.GetOrdinal("ReservationFee")),
                ReservedAt = reader.IsDBNull(reader.GetOrdinal("ReservedAt")) ? null : reader.GetDateTime(reader.GetOrdinal("ReservedAt")),
            });
        }

        return items;
    }

    public async Task<IReadOnlyList<ScholarshipApplicantListItem>> GetScholarshipApplicantListAsync(
        string? scholarshipName, string? status, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT
    sa.ApplicationId, sa.UserId, u.FirstName, u.LastName, u.Email,
    sc.Name AS ScholarshipName, sa.ScholarshipType, sa.GradeAverage, sa.Status, sa.SubmittedAt
FROM dbo.ScholarshipApplications sa
JOIN dbo.Users u ON u.UserId = sa.UserId
JOIN dbo.Scholarships sc ON sc.ScholarshipId = sa.ScholarshipId
WHERE (@ScholarshipName IS NULL OR sc.Name LIKE '%' + @ScholarshipName + '%')
  AND (@Status IS NULL OR sa.Status = @Status)
ORDER BY sa.SubmittedAt DESC;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@ScholarshipName", SqlDbType.NVarChar, 200) { Value = (object?)NullIfEmpty(scholarshipName) ?? DBNull.Value });
        command.Parameters.Add(new SqlParameter("@Status", SqlDbType.NVarChar, 30) { Value = (object?)NullIfEmpty(status) ?? DBNull.Value });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var items = new List<ScholarshipApplicantListItem>();
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(new ScholarshipApplicantListItem
            {
                ApplicationId = reader.GetGuid(reader.GetOrdinal("ApplicationId")),
                UserId = reader.GetGuid(reader.GetOrdinal("UserId")),
                ApplicantName = $"{reader.GetString(reader.GetOrdinal("FirstName"))} {reader.GetString(reader.GetOrdinal("LastName"))}",
                ApplicantEmail = reader.GetString(reader.GetOrdinal("Email")),
                ScholarshipName = reader.GetString(reader.GetOrdinal("ScholarshipName")),
                ScholarshipType = reader.GetString(reader.GetOrdinal("ScholarshipType")),
                GradeAverage = reader.GetDecimal(reader.GetOrdinal("GradeAverage")),
                Status = reader.GetString(reader.GetOrdinal("Status")),
                SubmittedAt = reader.GetDateTime(reader.GetOrdinal("SubmittedAt")),
            });
        }

        return items;
    }

    public async Task<IReadOnlyList<ScholarshipQualificationListItem>> GetScholarshipQualificationListAsync(
        string? verdict, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT
    s.ApplicationId, u.FirstName, u.LastName, u.Email, sc.Name AS ScholarshipName,
    s.Verdict, s.Remarks, s.EvaluatedAt, eu.FirstName AS EvaluatedByFirstName, eu.LastName AS EvaluatedByLastName
FROM dbo.ScholarshipEligibilityScreenings s
JOIN dbo.ScholarshipApplications sa ON sa.ApplicationId = s.ApplicationId
JOIN dbo.Users u ON u.UserId = sa.UserId
JOIN dbo.Scholarships sc ON sc.ScholarshipId = sa.ScholarshipId
JOIN dbo.Users eu ON eu.UserId = s.EvaluatedByUserId
WHERE (@Verdict IS NULL OR s.Verdict = @Verdict)
ORDER BY s.EvaluatedAt DESC;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Verdict", SqlDbType.NVarChar, 20) { Value = (object?)NullIfEmpty(verdict) ?? DBNull.Value });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var items = new List<ScholarshipQualificationListItem>();
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(new ScholarshipQualificationListItem
            {
                ApplicationId = reader.GetGuid(reader.GetOrdinal("ApplicationId")),
                ApplicantName = $"{reader.GetString(reader.GetOrdinal("FirstName"))} {reader.GetString(reader.GetOrdinal("LastName"))}",
                ApplicantEmail = reader.GetString(reader.GetOrdinal("Email")),
                ScholarshipName = reader.GetString(reader.GetOrdinal("ScholarshipName")),
                Verdict = reader.GetString(reader.GetOrdinal("Verdict")),
                Remarks = reader.IsDBNull(reader.GetOrdinal("Remarks")) ? null : reader.GetString(reader.GetOrdinal("Remarks")),
                EvaluatedByName = $"{reader.GetString(reader.GetOrdinal("EvaluatedByFirstName"))} {reader.GetString(reader.GetOrdinal("EvaluatedByLastName"))}",
                EvaluatedAt = reader.GetDateTime(reader.GetOrdinal("EvaluatedAt")),
            });
        }

        return items;
    }

    public async Task<IReadOnlyList<ScholarshipResultListItem>> GetScholarshipResultListAsync(
        string? decision, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = ResultSelectColumns + @"
FROM dbo.ScholarshipApplications sa
JOIN dbo.Users u ON u.UserId = sa.UserId
JOIN dbo.Scholarships sc ON sc.ScholarshipId = sa.ScholarshipId
LEFT JOIN dbo.ScholarshipFinalDecisions fd ON fd.ApplicationId = sa.ApplicationId
LEFT JOIN dbo.Users du ON du.UserId = fd.DecidedByUserId
WHERE sa.Status IN (N'Approved', N'Rejected')
  AND (@Decision IS NULL OR COALESCE(fd.Decision, sa.Status) = @Decision)
ORDER BY sa.SubmittedAt DESC;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Decision", SqlDbType.NVarChar, 20) { Value = (object?)NullIfEmpty(decision) ?? DBNull.Value });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var items = new List<ScholarshipResultListItem>();
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(MapResult(reader));
        }

        return items;
    }

    public async Task<ScholarshipResultListItem?> GetScholarshipResultByApplicationIdAsync(
        Guid applicationId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = ResultSelectColumns + @"
FROM dbo.ScholarshipApplications sa
JOIN dbo.Users u ON u.UserId = sa.UserId
JOIN dbo.Scholarships sc ON sc.ScholarshipId = sa.ScholarshipId
LEFT JOIN dbo.ScholarshipFinalDecisions fd ON fd.ApplicationId = sa.ApplicationId
LEFT JOIN dbo.Users du ON du.UserId = fd.DecidedByUserId
WHERE sa.ApplicationId = @ApplicationId;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = applicationId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? MapResult(reader) : null;
    }

    private const string ResultSelectColumns = @"
SELECT
    sa.ApplicationId, u.FirstName, u.LastName, u.Email,
    sc.Name AS ScholarshipName, sa.ScholarshipType, sa.GradeAverage, sa.Status, sa.SubmittedAt,
    fd.Decision, fd.Remarks AS DecisionRemarks, fd.DecidedAt,
    du.FirstName AS DecidedByFirstName, du.LastName AS DecidedByLastName";

    private static ScholarshipResultListItem MapResult(SqlDataReader reader)
    {
        var decidedByFirstNameOrdinal = reader.GetOrdinal("DecidedByFirstName");

        return new ScholarshipResultListItem
        {
            ApplicationId = reader.GetGuid(reader.GetOrdinal("ApplicationId")),
            ApplicantName = $"{reader.GetString(reader.GetOrdinal("FirstName"))} {reader.GetString(reader.GetOrdinal("LastName"))}",
            ApplicantEmail = reader.GetString(reader.GetOrdinal("Email")),
            ScholarshipName = reader.GetString(reader.GetOrdinal("ScholarshipName")),
            ScholarshipType = reader.GetString(reader.GetOrdinal("ScholarshipType")),
            GradeAverage = reader.GetDecimal(reader.GetOrdinal("GradeAverage")),
            Status = reader.GetString(reader.GetOrdinal("Status")),
            Decision = reader.IsDBNull(reader.GetOrdinal("Decision")) ? null : reader.GetString(reader.GetOrdinal("Decision")),
            DecisionRemarks = reader.IsDBNull(reader.GetOrdinal("DecisionRemarks")) ? null : reader.GetString(reader.GetOrdinal("DecisionRemarks")),
            DecidedByName = reader.IsDBNull(decidedByFirstNameOrdinal)
                ? null
                : $"{reader.GetString(decidedByFirstNameOrdinal)} {reader.GetString(reader.GetOrdinal("DecidedByLastName"))}",
            DecidedAt = reader.IsDBNull(reader.GetOrdinal("DecidedAt")) ? null : reader.GetDateTime(reader.GetOrdinal("DecidedAt")),
            SubmittedAt = reader.GetDateTime(reader.GetOrdinal("SubmittedAt")),
        };
    }

    public async Task<IReadOnlyList<(DateOnly WeekStart, string Category, int Count)>> GetWeeklyApplicationCountsAsync(
        DateOnly sinceWeekStart, string? program, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
WITH Combined AS (
    SELECT a.SubmittedAt, N'Admission' AS Category, a.CourseAppliedFor AS Program
    FROM dbo.AdmissionApplications a
    WHERE a.IsArchived = 0

    UNION ALL

    SELECT sa.SubmittedAt, N'Scholarship' AS Category, CAST(NULL AS NVARCHAR(200)) AS Program
    FROM dbo.ScholarshipApplications sa
    WHERE sa.IsArchived = 0
)
SELECT
    DATEADD(WEEK, DATEDIFF(WEEK, 0, SubmittedAt), 0) AS WeekStart,
    Category,
    COUNT(*) AS Cnt
FROM Combined
WHERE SubmittedAt >= @Since
  AND (@Program IS NULL OR Category = N'Scholarship' OR Program LIKE '%' + @Program + '%')
GROUP BY DATEADD(WEEK, DATEDIFF(WEEK, 0, SubmittedAt), 0), Category
ORDER BY WeekStart ASC;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Since", SqlDbType.Date) { Value = sinceWeekStart.ToDateTime(TimeOnly.MinValue) });
        command.Parameters.Add(new SqlParameter("@Program", SqlDbType.NVarChar, 200) { Value = (object?)NullIfEmpty(program) ?? DBNull.Value });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var results = new List<(DateOnly, string, int)>();
        while (await reader.ReadAsync(cancellationToken))
        {
            results.Add((
                DateOnly.FromDateTime(reader.GetDateTime(reader.GetOrdinal("WeekStart"))),
                reader.GetString(reader.GetOrdinal("Category")),
                reader.GetInt32(reader.GetOrdinal("Cnt"))));
        }

        return results;
    }

    public async Task<IReadOnlyList<(string Status, int Count)>> GetAdmissionFunnelCountsAsync(
        string? program, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT h.ToStatus, COUNT(DISTINCT h.ApplicationId) AS Cnt
FROM dbo.ApplicationStatusHistory h
JOIN dbo.AdmissionApplications a ON a.ApplicationId = h.ApplicationId
WHERE h.Category = N'Admission' AND a.IsArchived = 0
  AND (@Program IS NULL OR a.CourseAppliedFor LIKE '%' + @Program + '%')
GROUP BY h.ToStatus;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Program", SqlDbType.NVarChar, 200) { Value = (object?)NullIfEmpty(program) ?? DBNull.Value });

        return await ReadFunnelCountsAsync(command, cancellationToken);
    }

    public async Task<IReadOnlyList<(string Status, int Count)>> GetScholarshipFunnelCountsAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT h.ToStatus, COUNT(DISTINCT h.ApplicationId) AS Cnt
FROM dbo.ApplicationStatusHistory h
JOIN dbo.ScholarshipApplications sa ON sa.ApplicationId = h.ApplicationId
WHERE h.Category = N'Scholarship' AND sa.IsArchived = 0
GROUP BY h.ToStatus;";

        await using var command = new SqlCommand(sql, connection);
        return await ReadFunnelCountsAsync(command, cancellationToken);
    }

    private static async Task<IReadOnlyList<(string Status, int Count)>> ReadFunnelCountsAsync(
        SqlCommand command, CancellationToken cancellationToken)
    {
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var results = new List<(string, int)>();
        while (await reader.ReadAsync(cancellationToken))
        {
            results.Add((reader.GetString(reader.GetOrdinal("ToStatus")), reader.GetInt32(reader.GetOrdinal("Cnt"))));
        }

        return results;
    }

    private static string? NullIfEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
