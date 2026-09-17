using System.Data;
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

    public async Task<AdmissionAnalytics> GetAnalyticsAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT
    COUNT(*) AS TotalApplications,
    COUNT(DISTINCT UserId) AS TotalApplicants,
    SUM(CASE WHEN Status IN (N'Submitted', N'UnderReview') THEN 1 ELSE 0 END) AS PendingCount,
    SUM(CASE WHEN Status = N'Approved' THEN 1 ELSE 0 END) AS ApprovedCount,
    SUM(CASE WHEN Status = N'Rejected' THEN 1 ELSE 0 END) AS RejectedCount
FROM dbo.AdmissionApplications;";

        await using var command = new SqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);

        return new AdmissionAnalytics
        {
            TotalApplications = reader.GetInt32(reader.GetOrdinal("TotalApplications")),
            TotalApplicants = reader.GetInt32(reader.GetOrdinal("TotalApplicants")),
            PendingCount = reader.IsDBNull(reader.GetOrdinal("PendingCount")) ? 0 : reader.GetInt32(reader.GetOrdinal("PendingCount")),
            ApprovedCount = reader.IsDBNull(reader.GetOrdinal("ApprovedCount")) ? 0 : reader.GetInt32(reader.GetOrdinal("ApprovedCount")),
            RejectedCount = reader.IsDBNull(reader.GetOrdinal("RejectedCount")) ? 0 : reader.GetInt32(reader.GetOrdinal("RejectedCount")),
        };
    }

    public async Task<IReadOnlyList<ProgramApplicantCount>> GetByProgramAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT CourseAppliedFor AS Program, COUNT(*) AS Count
FROM dbo.AdmissionApplications
GROUP BY CourseAppliedFor
ORDER BY COUNT(*) DESC, CourseAppliedFor ASC;";

        await using var command = new SqlCommand(sql, connection);
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

    public async Task<IReadOnlyList<RecentAdmissionApplication>> GetRecentAsync(int take, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT TOP (@Take)
    a.ApplicationId, u.FirstName, u.LastName, a.ApplicationType, a.CourseAppliedFor, a.Status, a.SubmittedAt
FROM dbo.AdmissionApplications a
JOIN dbo.Users u ON u.UserId = a.UserId
ORDER BY a.SubmittedAt DESC;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Take", SqlDbType.Int) { Value = take });

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
                Status = reader.GetString(reader.GetOrdinal("Status")),
                SubmittedAt = reader.GetDateTime(reader.GetOrdinal("SubmittedAt")),
            });
        }

        return applications;
    }
}
