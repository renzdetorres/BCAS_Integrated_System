using System.Data;
using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class EvaluatorDashboardRepository : IEvaluatorDashboardRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public EvaluatorDashboardRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<int> GetPendingCountAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT COUNT(*)
FROM dbo.ScholarshipApplications
WHERE Status IN (N'Submitted', N'DocumentsVerified', N'EligibilityScreening', N'Evaluation');";

        await using var command = new SqlCommand(sql, connection);
        return (int)await command.ExecuteScalarAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<EvaluatorQueueApplication>> GetQueueAsync(int take, CancellationToken cancellationToken = default)
    {
        // Oldest submitted first - the applicant who has waited longest for a
        // decision comes to the top of the evaluator's queue.
        const string sql = @"
SELECT TOP (@Take)
    sa.ApplicationId, u.FirstName, u.LastName, sc.Name AS ScholarshipName, sa.ScholarshipType, sa.GradeAverage, sa.Status, sa.SubmittedAt
FROM dbo.ScholarshipApplications sa
JOIN dbo.Users u ON u.UserId = sa.UserId
JOIN dbo.Scholarships sc ON sc.ScholarshipId = sa.ScholarshipId
WHERE sa.Status IN (N'Submitted', N'DocumentsVerified', N'EligibilityScreening', N'Evaluation')
ORDER BY sa.SubmittedAt ASC;";

        return await GetApplicationsAsync(sql, take, cancellationToken);
    }

    public async Task<IReadOnlyList<EvaluatorQueueApplication>> GetRecentlyEvaluatedAsync(int take, CancellationToken cancellationToken = default)
    {
        // "Evaluated" here means the workflow has reached Result (or a final
        // decision, once BISAASS-47 starts setting Approved/Rejected) -
        // UpdatedAt now tracks the last workflow move (BISAASS-43), so it's
        // an accurate "most recent" order rather than a SubmittedAt proxy.
        const string sql = @"
SELECT TOP (@Take)
    sa.ApplicationId, u.FirstName, u.LastName, sc.Name AS ScholarshipName, sa.ScholarshipType, sa.GradeAverage, sa.Status, sa.SubmittedAt
FROM dbo.ScholarshipApplications sa
JOIN dbo.Users u ON u.UserId = sa.UserId
JOIN dbo.Scholarships sc ON sc.ScholarshipId = sa.ScholarshipId
WHERE sa.Status IN (N'Result', N'Approved', N'Rejected')
ORDER BY sa.UpdatedAt DESC;";

        return await GetApplicationsAsync(sql, take, cancellationToken);
    }

    private async Task<IReadOnlyList<EvaluatorQueueApplication>> GetApplicationsAsync(
        string sql,
        int take,
        CancellationToken cancellationToken)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Take", SqlDbType.Int) { Value = take });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var applications = new List<EvaluatorQueueApplication>();
        while (await reader.ReadAsync(cancellationToken))
        {
            applications.Add(new EvaluatorQueueApplication
            {
                ApplicationId = reader.GetGuid(reader.GetOrdinal("ApplicationId")),
                ApplicantName = $"{reader.GetString(reader.GetOrdinal("FirstName"))} {reader.GetString(reader.GetOrdinal("LastName"))}",
                ScholarshipName = reader.GetString(reader.GetOrdinal("ScholarshipName")),
                ScholarshipType = reader.GetString(reader.GetOrdinal("ScholarshipType")),
                GradeAverage = reader.GetDecimal(reader.GetOrdinal("GradeAverage")),
                Status = reader.GetString(reader.GetOrdinal("Status")),
                SubmittedAt = reader.GetDateTime(reader.GetOrdinal("SubmittedAt")),
            });
        }

        return applications;
    }
}
