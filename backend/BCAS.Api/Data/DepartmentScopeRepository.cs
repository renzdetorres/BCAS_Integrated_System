using System.Data;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class DepartmentScopeRepository : IDepartmentScopeRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public DepartmentScopeRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<(bool Found, string? Department)> GetScholarshipApplicationDepartmentAsync(
        Guid applicationId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT d.Department
FROM dbo.ScholarshipApplications sa
LEFT JOIN dbo.vw_ApplicantDepartments d ON d.UserId = sa.UserId
WHERE sa.ApplicationId = @ApplicationId;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = applicationId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return (false, null);
        }

        var ordinal = reader.GetOrdinal("Department");
        return (true, reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal));
    }

    public async Task<bool> SetAdmissionApplicationDepartmentAsync(
        Guid applicationId, string department, string? courseAppliedFor = null, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        // UpdatedAt deliberately untouched - it tracks the last workflow
        // move, and correcting which department an application is filed
        // under isn't one.
        const string sql = @"
UPDATE dbo.AdmissionApplications
SET Department = @Department,
    CourseAppliedFor = COALESCE(@CourseAppliedFor, CourseAppliedFor)
WHERE ApplicationId = @ApplicationId;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = applicationId });
        command.Parameters.Add(new SqlParameter("@Department", SqlDbType.NVarChar, 100) { Value = department });
        command.Parameters.Add(new SqlParameter("@CourseAppliedFor", SqlDbType.NVarChar, 200) { Value = (object?)courseAppliedFor ?? DBNull.Value });

        return await command.ExecuteNonQueryAsync(cancellationToken) > 0;
    }
}
