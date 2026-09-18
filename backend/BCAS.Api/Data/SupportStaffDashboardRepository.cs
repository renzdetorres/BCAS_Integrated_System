using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class SupportStaffDashboardRepository : ISupportStaffDashboardRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public SupportStaffDashboardRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<SupportStaffDashboardResponse> GetCountsAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string documentCountsSql = @"
SELECT
    SUM(CASE WHEN Status = N'Pending' AND IsArchived = 0 THEN 1 ELSE 0 END) AS PendingVerificationCount,
    SUM(CASE WHEN Status = N'Verified' AND CAST(UpdatedAt AS DATE) = CAST(SYSUTCDATETIME() AS DATE) THEN 1 ELSE 0 END) AS VerifiedTodayCount,
    SUM(CASE WHEN Status = N'Flagged' AND IsArchived = 0 THEN 1 ELSE 0 END) AS FlaggedDocsCount
FROM dbo.ApplicantDocuments;";

        var response = new SupportStaffDashboardResponse();

        await using (var command = new SqlCommand(documentCountsSql, connection))
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            if (await reader.ReadAsync(cancellationToken))
            {
                response.PendingVerificationCount = GetIntOrZero(reader, "PendingVerificationCount");
                response.VerifiedTodayCount = GetIntOrZero(reader, "VerifiedTodayCount");
                response.FlaggedDocsCount = GetIntOrZero(reader, "FlaggedDocsCount");
            }
        }

        const string totalApplicantsSql = @"
SELECT COUNT(*)
FROM dbo.Users u
JOIN dbo.Roles r ON r.RoleId = u.RoleId
WHERE r.RoleName = N'Applicant';";

        await using (var command = new SqlCommand(totalApplicantsSql, connection))
        {
            response.TotalApplicants = (int)await command.ExecuteScalarAsync(cancellationToken);
        }

        return response;
    }

    private static int GetIntOrZero(SqlDataReader reader, string column)
    {
        var ordinal = reader.GetOrdinal(column);
        return reader.IsDBNull(ordinal) ? 0 : reader.GetInt32(ordinal);
    }
}
