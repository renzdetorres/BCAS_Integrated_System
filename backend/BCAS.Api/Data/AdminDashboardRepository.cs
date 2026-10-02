using System.Data;
using BCAS.Api.Constants;
using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class AdminDashboardRepository : IAdminDashboardRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public AdminDashboardRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<AdmissionAnalytics> GetAnalyticsAsync(string? department = null, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT
    COUNT(*) AS TotalApplications,
    COUNT(DISTINCT UserId) AS TotalApplicants,
    SUM(CASE WHEN Status IN (N'Submitted', N'UnderReview') THEN 1 ELSE 0 END) AS PendingCount,
    SUM(CASE WHEN Status = N'Approved' THEN 1 ELSE 0 END) AS ApprovedCount,
    SUM(CASE WHEN Status = N'Rejected' THEN 1 ELSE 0 END) AS RejectedCount,
    SUM(CASE WHEN SubmittedAt >= DATEADD(DAY, -7, SYSUTCDATETIME()) THEN 1 ELSE 0 END) AS SubmittedThisWeek,
    SUM(CASE WHEN Department IS NULL THEN 1 ELSE 0 END) AS UnassignedCount
FROM dbo.AdmissionApplications
WHERE @Department IS NULL OR Department = @Department;";

        await using var command = new SqlCommand(sql, connection);
        AddDepartmentParameter(command, department);
        return await ReadAnalyticsAsync(command, cancellationToken);
    }

    public async Task<ProgramBreakdown> GetByProgramAsync(string? department = null, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        // One row per applicant and course; the grouping happens below so an
        // applicant who typed two spellings of the same program counts once.
        const string sql = @"
SELECT DISTINCT UserId, CourseAppliedFor, Department
FROM dbo.AdmissionApplications
WHERE @Department IS NULL OR Department = @Department;";

        await using var command = new SqlCommand(sql, connection);
        AddDepartmentParameter(command, department);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var applicantsByProgram = DepartmentConstants.FixedPrograms["College"]
            .ToDictionary(p => p.Code, _ => new HashSet<Guid>(), StringComparer.Ordinal);
        var otherApplicants = new HashSet<Guid>();

        while (await reader.ReadAsync(cancellationToken))
        {
            var rowDepartment = ReadNullableString(reader, "Department");

            // Strands and grade levels aren't programs.
            if (rowDepartment is not null && rowDepartment != "College")
            {
                continue;
            }

            var userId = reader.GetGuid(reader.GetOrdinal("UserId"));
            var course = reader.GetString(reader.GetOrdinal("CourseAppliedFor"));
            var code = DepartmentConstants.ProgramCodeFor(course);

            if (code is not null)
            {
                applicantsByProgram[code].Add(userId);
            }
            else if (rowDepartment == "College" || DepartmentConstants.LooksLikeCollegeCourse(course))
            {
                // Filed under College (or an older application with no
                // department) but for a course the school doesn't offer.
                otherApplicants.Add(userId);
            }
        }

        // Someone already counted under a program isn't also "other".
        otherApplicants.ExceptWith(applicantsByProgram.Values.SelectMany(set => set));

        return new ProgramBreakdown
        {
            Programs = DepartmentConstants.FixedPrograms["College"]
                .Select(p => new ProgramApplicantCount { Program = p.Code, Count = applicantsByProgram[p.Code].Count })
                .ToList(),
            OtherApplicants = otherApplicants.Count,
        };
    }

    public async Task<IReadOnlyList<DepartmentCount>> GetByDepartmentAsync(string? department = null, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT Department, COUNT(*) AS Count
FROM dbo.AdmissionApplications
WHERE @Department IS NULL OR Department = @Department
GROUP BY Department;";

        await using var command = new SqlCommand(sql, connection);
        AddDepartmentParameter(command, department);
        return await ReadDepartmentCountsAsync(command, cancellationToken);
    }

    public async Task<IReadOnlyList<RecentAdmissionApplication>> GetRecentAsync(
        int take, string? department = null, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT TOP (@Take)
    a.ApplicationId, u.FirstName, u.LastName, a.ApplicationType, a.CourseAppliedFor, a.Department, a.Status, a.SubmittedAt
FROM dbo.AdmissionApplications a
JOIN dbo.Users u ON u.UserId = a.UserId
WHERE @Department IS NULL OR a.Department = @Department
ORDER BY a.SubmittedAt DESC;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Take", SqlDbType.Int) { Value = take });
        AddDepartmentParameter(command, department);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var applications = new List<RecentAdmissionApplication>();
        while (await reader.ReadAsync(cancellationToken))
        {
            applications.Add(new RecentAdmissionApplication
            {
                ApplicationId = reader.GetGuid(reader.GetOrdinal("ApplicationId")),
                ApplicantName = $"{reader.GetString(reader.GetOrdinal("FirstName"))} {reader.GetString(reader.GetOrdinal("LastName"))}",
                ApplicationType = reader.GetString(reader.GetOrdinal("ApplicationType")),
                CourseAppliedFor = reader.GetString(reader.GetOrdinal("CourseAppliedFor")),
                Department = ReadNullableString(reader, "Department"),
                Status = reader.GetString(reader.GetOrdinal("Status")),
                SubmittedAt = reader.GetDateTime(reader.GetOrdinal("SubmittedAt")),
            });
        }

        return applications;
    }

    public async Task<int> GetPendingDocumentsCountAsync(string? department = null, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT COUNT(*)
FROM dbo.ApplicantDocuments doc
LEFT JOIN dbo.vw_ApplicantDepartments d ON d.UserId = doc.UserId
WHERE doc.Status = N'Pending' AND doc.IsArchived = 0
  AND (@Department IS NULL OR d.Department = @Department);";

        await using var command = new SqlCommand(sql, connection);
        AddDepartmentParameter(command, department);
        return (int)(await command.ExecuteScalarAsync(cancellationToken) ?? 0);
    }

    // Scholarship applications have no department of their own - each one
    // takes its applicant's latest admission application's department
    // (vw_ApplicantDepartments), the same rule the Academic Head scope uses.
    private const string ScholarshipFromClause = @"
FROM dbo.ScholarshipApplications sa
LEFT JOIN dbo.vw_ApplicantDepartments d ON d.UserId = sa.UserId
WHERE @Department IS NULL OR d.Department = @Department";

    public async Task<AdmissionAnalytics> GetScholarshipAnalyticsAsync(string? department = null, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT
    COUNT(*) AS TotalApplications,
    COUNT(DISTINCT sa.UserId) AS TotalApplicants,
    SUM(CASE WHEN sa.Status NOT IN (N'Approved', N'Rejected') THEN 1 ELSE 0 END) AS PendingCount,
    SUM(CASE WHEN sa.Status = N'Approved' THEN 1 ELSE 0 END) AS ApprovedCount,
    SUM(CASE WHEN sa.Status = N'Rejected' THEN 1 ELSE 0 END) AS RejectedCount,
    SUM(CASE WHEN sa.SubmittedAt >= DATEADD(DAY, -7, SYSUTCDATETIME()) THEN 1 ELSE 0 END) AS SubmittedThisWeek,
    SUM(CASE WHEN d.Department IS NULL THEN 1 ELSE 0 END) AS UnassignedCount" + ScholarshipFromClause + ";";

        await using var command = new SqlCommand(sql, connection);
        AddDepartmentParameter(command, department);
        return await ReadAnalyticsAsync(command, cancellationToken);
    }

    public async Task<IReadOnlyList<DepartmentCount>> GetScholarshipByDepartmentAsync(string? department = null, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = "SELECT d.Department, COUNT(*) AS Count" + ScholarshipFromClause + @"
GROUP BY d.Department;";

        await using var command = new SqlCommand(sql, connection);
        AddDepartmentParameter(command, department);
        return await ReadDepartmentCountsAsync(command, cancellationToken);
    }

    public async Task<IReadOnlyList<ProgramApplicantCount>> GetScholarshipByProgramAsync(string? department = null, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT sc.Name AS Program, COUNT(DISTINCT sa.UserId) AS Count
FROM dbo.ScholarshipApplications sa
JOIN dbo.Scholarships sc ON sc.ScholarshipId = sa.ScholarshipId
LEFT JOIN dbo.vw_ApplicantDepartments d ON d.UserId = sa.UserId
WHERE @Department IS NULL OR d.Department = @Department
GROUP BY sc.Name
ORDER BY COUNT(DISTINCT sa.UserId) DESC, sc.Name ASC;";

        await using var command = new SqlCommand(sql, connection);
        AddDepartmentParameter(command, department);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var counts = new List<ProgramApplicantCount>();
        while (await reader.ReadAsync(cancellationToken))
        {
            counts.Add(new ProgramApplicantCount
            {
                Program = reader.GetString(reader.GetOrdinal("Program")),
                Count = reader.GetInt32(reader.GetOrdinal("Count")),
            });
        }

        return counts;
    }

    public async Task<IReadOnlyList<RecentScholarshipApplication>> GetRecentScholarshipAsync(
        int take, string? department = null, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT TOP (@Take)
    sa.ApplicationId, u.FirstName, u.LastName, sc.Name AS ScholarshipName, d.Department, sa.Status, sa.SubmittedAt
FROM dbo.ScholarshipApplications sa
JOIN dbo.Users u ON u.UserId = sa.UserId
JOIN dbo.Scholarships sc ON sc.ScholarshipId = sa.ScholarshipId
LEFT JOIN dbo.vw_ApplicantDepartments d ON d.UserId = sa.UserId
WHERE @Department IS NULL OR d.Department = @Department
ORDER BY sa.SubmittedAt DESC;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Take", SqlDbType.Int) { Value = take });
        AddDepartmentParameter(command, department);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var applications = new List<RecentScholarshipApplication>();
        while (await reader.ReadAsync(cancellationToken))
        {
            applications.Add(new RecentScholarshipApplication
            {
                ApplicationId = reader.GetGuid(reader.GetOrdinal("ApplicationId")),
                ApplicantName = $"{reader.GetString(reader.GetOrdinal("FirstName"))} {reader.GetString(reader.GetOrdinal("LastName"))}",
                ScholarshipName = reader.GetString(reader.GetOrdinal("ScholarshipName")),
                Department = ReadNullableString(reader, "Department"),
                Status = reader.GetString(reader.GetOrdinal("Status")),
                SubmittedAt = reader.GetDateTime(reader.GetOrdinal("SubmittedAt")),
            });
        }

        return applications;
    }

    private static async Task<AdmissionAnalytics> ReadAnalyticsAsync(SqlCommand command, CancellationToken cancellationToken)
    {
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);

        return new AdmissionAnalytics
        {
            TotalApplications = reader.GetInt32(reader.GetOrdinal("TotalApplications")),
            TotalApplicants = reader.GetInt32(reader.GetOrdinal("TotalApplicants")),
            PendingCount = ReadSum(reader, "PendingCount"),
            ApprovedCount = ReadSum(reader, "ApprovedCount"),
            RejectedCount = ReadSum(reader, "RejectedCount"),
            SubmittedThisWeek = ReadSum(reader, "SubmittedThisWeek"),
            UnassignedCount = ReadSum(reader, "UnassignedCount"),
        };
    }

    private static async Task<IReadOnlyList<DepartmentCount>> ReadDepartmentCountsAsync(SqlCommand command, CancellationToken cancellationToken)
    {
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var counts = new List<DepartmentCount>();
        while (await reader.ReadAsync(cancellationToken))
        {
            counts.Add(new DepartmentCount
            {
                Department = ReadNullableString(reader, "Department"),
                Count = reader.GetInt32(reader.GetOrdinal("Count")),
            });
        }

        return counts;
    }

    // SUM over zero rows is NULL, not 0.
    private static int ReadSum(SqlDataReader reader, string column) =>
        reader.IsDBNull(reader.GetOrdinal(column)) ? 0 : reader.GetInt32(reader.GetOrdinal(column));

    private static string? ReadNullableString(SqlDataReader reader, string column) =>
        reader.IsDBNull(reader.GetOrdinal(column)) ? null : reader.GetString(reader.GetOrdinal(column));

    private static void AddDepartmentParameter(SqlCommand command, string? department) =>
        command.Parameters.Add(new SqlParameter("@Department", SqlDbType.NVarChar, 100) { Value = (object?)department ?? DBNull.Value });
}
