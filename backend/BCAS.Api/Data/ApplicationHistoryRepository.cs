using System.Data;
using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class ApplicationHistoryRepository : IApplicationHistoryRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public ApplicationHistoryRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<ApplicationHistoryItem>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT ApplicationId, UserId, Category, ApplicationType, CourseAppliedFor, PreviousSchool,
       ScholarshipName, ScholarshipType, GradeAverage, Status, SubmittedAt
FROM dbo.vw_ApplicationHistory
WHERE UserId = @UserId
ORDER BY SubmittedAt DESC;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var items = new List<ApplicationHistoryItem>();
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(MapItem(reader));
        }

        return items;
    }

    private static ApplicationHistoryItem MapItem(SqlDataReader reader) => new()
    {
        ApplicationId = reader.GetGuid(reader.GetOrdinal("ApplicationId")),
        UserId = reader.GetGuid(reader.GetOrdinal("UserId")),
        Category = reader.GetString(reader.GetOrdinal("Category")),
        ApplicationType = reader.GetNullableString(reader.GetOrdinal("ApplicationType")),
        CourseAppliedFor = reader.GetNullableString(reader.GetOrdinal("CourseAppliedFor")),
        PreviousSchool = reader.GetNullableString(reader.GetOrdinal("PreviousSchool")),
        ScholarshipName = reader.GetNullableString(reader.GetOrdinal("ScholarshipName")),
        ScholarshipType = reader.GetNullableString(reader.GetOrdinal("ScholarshipType")),
        GradeAverage = reader.IsDBNull(reader.GetOrdinal("GradeAverage")) ? null : reader.GetDecimal(reader.GetOrdinal("GradeAverage")),
        Status = reader.GetString(reader.GetOrdinal("Status")),
        SubmittedAt = reader.GetDateTime(reader.GetOrdinal("SubmittedAt")),
    };
}

internal static class SqlDataReaderExtensions
{
    public static string? GetNullableString(this SqlDataReader reader, int ordinal) =>
        reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
}
