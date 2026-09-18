using System.Data;
using BCAS.Api.Exceptions;
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

        const string sql = SelectColumns + @"
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
            items.Add(MapItem(reader));
        }

        return items;
    }

    public async Task<AdminApplicationListItem?> GetByIdAsync(Guid applicationId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = SelectColumns + @"
FROM dbo.vw_ApplicationHistory h
JOIN dbo.Users u ON u.UserId = h.UserId
WHERE h.ApplicationId = @ApplicationId;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = applicationId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? MapItem(reader) : null;
    }

    public async Task<AdminApplicationListItem?> UpdateStatusAsync(
        Guid applicationId,
        string category,
        string status,
        string? remarks,
        CancellationToken cancellationToken = default)
    {
        // category is validated by the caller against a fixed allowed set
        // before reaching here, but the switch below is the actual guard -
        // `table` can only ever be one of these two literals, never the
        // raw category value, so this is never vulnerable to injection
        // regardless of what category contains.
        var table = category switch
        {
            "Admission" => "dbo.AdmissionApplications",
            "Scholarship" => "dbo.ScholarshipApplications",
            _ => throw new InvalidApplicationCategoryException(category),
        };

        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        var updateSql = $@"
UPDATE {table}
SET Status = @Status, Remarks = @Remarks, UpdatedAt = SYSUTCDATETIME()
WHERE ApplicationId = @ApplicationId;";

        await using (var command = new SqlCommand(updateSql, connection))
        {
            command.Parameters.Add(new SqlParameter("@Status", SqlDbType.NVarChar, 30) { Value = status });
            command.Parameters.Add(new SqlParameter("@Remarks", SqlDbType.NVarChar, 1000) { Value = (object?)NullIfEmpty(remarks) ?? DBNull.Value });
            command.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = applicationId });

            var rowsAffected = await command.ExecuteNonQueryAsync(cancellationToken);
            if (rowsAffected == 0)
            {
                return null;
            }
        }

        return await GetByIdAsync(applicationId, cancellationToken);
    }

    private const string SelectColumns = @"
SELECT
    h.ApplicationId, h.UserId, u.FirstName, u.LastName, u.Email,
    h.Category, h.ApplicationType, h.CourseAppliedFor, h.PreviousSchool,
    h.ScholarshipName, h.ScholarshipType, h.GradeAverage, h.Status, h.Remarks, h.SubmittedAt, h.UpdatedAt";

    private static AdminApplicationListItem MapItem(SqlDataReader reader) => new()
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
        Remarks = reader.IsDBNull(reader.GetOrdinal("Remarks")) ? null : reader.GetString(reader.GetOrdinal("Remarks")),
        SubmittedAt = reader.GetDateTime(reader.GetOrdinal("SubmittedAt")),
        UpdatedAt = reader.GetDateTime(reader.GetOrdinal("UpdatedAt")),
    };

    private static string? NullIfEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
