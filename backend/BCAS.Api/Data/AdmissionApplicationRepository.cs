using System.Data;
using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class AdmissionApplicationRepository : IAdmissionApplicationRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public AdmissionApplicationRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<AdmissionApplication> CreateAsync(
        Guid userId,
        SubmitAdmissionApplicationRequest request,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
INSERT INTO dbo.AdmissionApplications (UserId, ApplicationType, CourseAppliedFor, PreviousSchool)
OUTPUT
    inserted.ApplicationId,
    inserted.UserId,
    inserted.ApplicationType,
    inserted.CourseAppliedFor,
    inserted.PreviousSchool,
    inserted.Status,
    inserted.SubmittedAt
VALUES (@UserId, @ApplicationType, @CourseAppliedFor, @PreviousSchool);";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
        command.Parameters.Add(new SqlParameter("@ApplicationType", SqlDbType.NVarChar, 20) { Value = request.ApplicationType });
        command.Parameters.Add(new SqlParameter("@CourseAppliedFor", SqlDbType.NVarChar, 200) { Value = request.CourseAppliedFor });
        command.Parameters.Add(new SqlParameter("@PreviousSchool", SqlDbType.NVarChar, 200) { Value = request.PreviousSchool });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);
        return MapApplication(reader);
    }

    public async Task<IReadOnlyList<AdmissionApplication>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT ApplicationId, UserId, ApplicationType, CourseAppliedFor, PreviousSchool, Status, SubmittedAt
FROM dbo.AdmissionApplications
WHERE UserId = @UserId
ORDER BY SubmittedAt DESC;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var applications = new List<AdmissionApplication>();
        while (await reader.ReadAsync(cancellationToken))
        {
            applications.Add(MapApplication(reader));
        }

        return applications;
    }

    private static AdmissionApplication MapApplication(SqlDataReader reader) => new()
    {
        ApplicationId = reader.GetGuid(reader.GetOrdinal("ApplicationId")),
        UserId = reader.GetGuid(reader.GetOrdinal("UserId")),
        ApplicationType = reader.GetString(reader.GetOrdinal("ApplicationType")),
        CourseAppliedFor = reader.GetString(reader.GetOrdinal("CourseAppliedFor")),
        PreviousSchool = reader.GetString(reader.GetOrdinal("PreviousSchool")),
        Status = reader.GetString(reader.GetOrdinal("Status")),
        SubmittedAt = reader.GetDateTime(reader.GetOrdinal("SubmittedAt")),
    };
}
