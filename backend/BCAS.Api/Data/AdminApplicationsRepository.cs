using System.Data;
using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class AdminApplicationsRepository : IAdminApplicationsRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public AdminApplicationsRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<AdminApplicationListItem>> SearchAsync(
        string? search,
        string? status,
        string? category,
        string? program,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT
    h.ApplicationId, h.UserId, u.FirstName, u.LastName, u.Email,
    h.Category, h.ApplicationType, h.CourseAppliedFor, h.PreviousSchool,
    h.ScholarshipName, h.ScholarshipType, h.GradeAverage, h.Status, h.SubmittedAt
FROM dbo.vw_ApplicationHistory h
JOIN dbo.Users u ON u.UserId = h.UserId
WHERE (@Search IS NULL OR u.FirstName LIKE '%' + @Search + '%' OR u.LastName LIKE '%' + @Search + '%' OR u.Email LIKE '%' + @Search + '%')
  AND (@Status IS NULL OR h.Status = @Status)
  AND (@Category IS NULL OR h.Category = @Category)
  AND (@Program IS NULL OR h.CourseAppliedFor LIKE '%' + @Program + '%' OR h.ScholarshipName LIKE '%' + @Program + '%')
ORDER BY h.SubmittedAt DESC;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Search", SqlDbType.NVarChar, 256) { Value = (object?)NullIfEmpty(search) ?? DBNull.Value });
        command.Parameters.Add(new SqlParameter("@Status", SqlDbType.NVarChar, 30) { Value = (object?)NullIfEmpty(status) ?? DBNull.Value });
        command.Parameters.Add(new SqlParameter("@Category", SqlDbType.NVarChar, 20) { Value = (object?)NullIfEmpty(category) ?? DBNull.Value });
        command.Parameters.Add(new SqlParameter("@Program", SqlDbType.NVarChar, 200) { Value = (object?)NullIfEmpty(program) ?? DBNull.Value });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var items = new List<AdminApplicationListItem>();
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(new AdminApplicationListItem
            {
                ApplicationId = reader.GetGuid(reader.GetOrdinal("ApplicationId")),
                UserId = reader.GetGuid(reader.GetOrdinal("UserId")),
                ApplicantName = $"{reader.GetString(reader.GetOrdinal("FirstName"))} {reader.GetString(reader.GetOrdinal("LastName"))}",
                ApplicantEmail = reader.GetString(reader.GetOrdinal("Email")),
                Category = reader.GetString(reader.GetOrdinal("Category")),
                ApplicationType = reader.IsDBNull(reader.GetOrdinal("ApplicationType")) ? null : reader.GetString(reader.GetOrdinal("ApplicationType")),
                CourseAppliedFor = reader.IsDBNull(reader.GetOrdinal("CourseAppliedFor")) ? null : reader.GetString(reader.GetOrdinal("CourseAppliedFor")),
                PreviousSchool = reader.IsDBNull(reader.GetOrdinal("PreviousSchool")) ? null : reader.GetString(reader.GetOrdinal("PreviousSchool")),
                ScholarshipName = reader.IsDBNull(reader.GetOrdinal("ScholarshipName")) ? null : reader.GetString(reader.GetOrdinal("ScholarshipName")),
                ScholarshipType = reader.IsDBNull(reader.GetOrdinal("ScholarshipType")) ? null : reader.GetString(reader.GetOrdinal("ScholarshipType")),
                GradeAverage = reader.IsDBNull(reader.GetOrdinal("GradeAverage")) ? null : reader.GetDecimal(reader.GetOrdinal("GradeAverage")),
                Status = reader.GetString(reader.GetOrdinal("Status")),
                SubmittedAt = reader.GetDateTime(reader.GetOrdinal("SubmittedAt")),
            });
        }

        return items;
    }

    private static string? NullIfEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
