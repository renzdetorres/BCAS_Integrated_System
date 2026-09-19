using System.Data;
using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class SupportStaffApplicantsRepository : ISupportStaffApplicantsRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public SupportStaffApplicantsRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<SupportStaffApplicantListItem>> SearchAsync(
        string? search, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT
    u.UserId, u.FirstName, u.LastName, u.Email, u.CreatedAt,
    a.ApplicationType, a.CourseAppliedFor, a.Status AS ApplicationStatus, a.SubmittedAt
FROM dbo.Users u
JOIN dbo.Roles r ON r.RoleId = u.RoleId
OUTER APPLY (
    SELECT TOP (1) aa.ApplicationType, aa.CourseAppliedFor, aa.Status, aa.SubmittedAt
    FROM dbo.AdmissionApplications aa
    WHERE aa.UserId = u.UserId
    ORDER BY aa.SubmittedAt DESC
) a
WHERE r.RoleName = N'Applicant'
  AND (@Search IS NULL OR u.FirstName LIKE '%' + @Search + '%' OR u.LastName LIKE '%' + @Search + '%' OR u.Email LIKE '%' + @Search + '%')
ORDER BY u.CreatedAt DESC;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Search", SqlDbType.NVarChar, 256) { Value = (object?)NullIfEmpty(search) ?? DBNull.Value });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var items = new List<SupportStaffApplicantListItem>();
        while (await reader.ReadAsync(cancellationToken))
        {
            var applicationTypeOrdinal = reader.GetOrdinal("ApplicationType");

            items.Add(new SupportStaffApplicantListItem
            {
                UserId = reader.GetGuid(reader.GetOrdinal("UserId")),
                FirstName = reader.GetString(reader.GetOrdinal("FirstName")),
                LastName = reader.GetString(reader.GetOrdinal("LastName")),
                Email = reader.GetString(reader.GetOrdinal("Email")),
                CreatedAt = reader.GetDateTime(reader.GetOrdinal("CreatedAt")),
                ApplicationType = reader.IsDBNull(applicationTypeOrdinal) ? null : reader.GetString(applicationTypeOrdinal),
                CourseAppliedFor = reader.IsDBNull(reader.GetOrdinal("CourseAppliedFor")) ? null : reader.GetString(reader.GetOrdinal("CourseAppliedFor")),
                ApplicationStatus = reader.IsDBNull(reader.GetOrdinal("ApplicationStatus")) ? null : reader.GetString(reader.GetOrdinal("ApplicationStatus")),
                SubmittedAt = reader.IsDBNull(reader.GetOrdinal("SubmittedAt")) ? null : reader.GetDateTime(reader.GetOrdinal("SubmittedAt")),
            });
        }

        return items;
    }

    private static string? NullIfEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
