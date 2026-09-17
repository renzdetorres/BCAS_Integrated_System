using System.Data;
using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class EvaluatorScholarshipApplicationRepository : IEvaluatorScholarshipApplicationRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public EvaluatorScholarshipApplicationRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<EvaluatorScholarshipApplicationDetail?> GetDetailAsync(
        Guid applicationId,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT
    sa.ApplicationId, u.FirstName, u.LastName, u.Email,
    ap.IsBcasian,
    sc.Name AS ScholarshipName, sa.ScholarshipType, sa.GradeAverage, sc.MinimumGradeAverage,
    sa.Status, sa.SubmittedAt,
    ses.Verdict, ses.Remarks, ses.EvaluatedAt,
    eu.FirstName AS EvaluatorFirstName, eu.LastName AS EvaluatorLastName
FROM dbo.ScholarshipApplications sa
JOIN dbo.Users u ON u.UserId = sa.UserId
JOIN dbo.Scholarships sc ON sc.ScholarshipId = sa.ScholarshipId
LEFT JOIN dbo.ApplicantProfiles ap ON ap.UserId = sa.UserId
LEFT JOIN dbo.ScholarshipEligibilityScreenings ses ON ses.ApplicationId = sa.ApplicationId
LEFT JOIN dbo.Users eu ON eu.UserId = ses.EvaluatedByUserId
WHERE sa.ApplicationId = @ApplicationId;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = applicationId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? MapDetail(reader) : null;
    }

    public async Task<ScholarshipEligibilityScreening?> UpsertScreeningAsync(
        Guid applicationId,
        string verdict,
        string? remarks,
        Guid evaluatedByUserId,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string existsSql = "SELECT 1 FROM dbo.ScholarshipApplications WHERE ApplicationId = @ApplicationId;";
        await using (var existsCommand = new SqlCommand(existsSql, connection))
        {
            existsCommand.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = applicationId });
            if (await existsCommand.ExecuteScalarAsync(cancellationToken) is null)
            {
                return null;
            }
        }

        const string upsertSql = @"
MERGE dbo.ScholarshipEligibilityScreenings AS target
USING (SELECT @ApplicationId AS ApplicationId) AS source
ON target.ApplicationId = source.ApplicationId
WHEN MATCHED THEN
    UPDATE SET Verdict = @Verdict, Remarks = @Remarks, EvaluatedByUserId = @EvaluatedByUserId, EvaluatedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
    INSERT (ApplicationId, Verdict, Remarks, EvaluatedByUserId)
    VALUES (@ApplicationId, @Verdict, @Remarks, @EvaluatedByUserId);";

        await using (var command = new SqlCommand(upsertSql, connection))
        {
            command.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = applicationId });
            command.Parameters.Add(new SqlParameter("@Verdict", SqlDbType.NVarChar, 20) { Value = verdict });
            command.Parameters.Add(new SqlParameter("@Remarks", SqlDbType.NVarChar, 1000) { Value = (object?)remarks ?? DBNull.Value });
            command.Parameters.Add(new SqlParameter("@EvaluatedByUserId", SqlDbType.UniqueIdentifier) { Value = evaluatedByUserId });
            await command.ExecuteNonQueryAsync(cancellationToken);
        }

        const string selectSql = @"
SELECT ses.ApplicationId, ses.Verdict, ses.Remarks, ses.EvaluatedAt, eu.FirstName, eu.LastName
FROM dbo.ScholarshipEligibilityScreenings ses
JOIN dbo.Users eu ON eu.UserId = ses.EvaluatedByUserId
WHERE ses.ApplicationId = @ApplicationId;";

        await using var selectCommand = new SqlCommand(selectSql, connection);
        selectCommand.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = applicationId });

        await using var reader = await selectCommand.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);

        return new ScholarshipEligibilityScreening
        {
            ApplicationId = reader.GetGuid(reader.GetOrdinal("ApplicationId")),
            Verdict = reader.GetString(reader.GetOrdinal("Verdict")),
            Remarks = reader.IsDBNull(reader.GetOrdinal("Remarks")) ? null : reader.GetString(reader.GetOrdinal("Remarks")),
            EvaluatedByName = $"{reader.GetString(reader.GetOrdinal("FirstName"))} {reader.GetString(reader.GetOrdinal("LastName"))}",
            EvaluatedAt = reader.GetDateTime(reader.GetOrdinal("EvaluatedAt")),
        };
    }

    private static EvaluatorScholarshipApplicationDetail MapDetail(SqlDataReader reader)
    {
        var detail = new EvaluatorScholarshipApplicationDetail
        {
            ApplicationId = reader.GetGuid(reader.GetOrdinal("ApplicationId")),
            ApplicantName = $"{reader.GetString(reader.GetOrdinal("FirstName"))} {reader.GetString(reader.GetOrdinal("LastName"))}",
            ApplicantEmail = reader.GetString(reader.GetOrdinal("Email")),
            IsBcasian = reader.IsDBNull(reader.GetOrdinal("IsBcasian")) ? null : reader.GetBoolean(reader.GetOrdinal("IsBcasian")),
            ScholarshipName = reader.GetString(reader.GetOrdinal("ScholarshipName")),
            ScholarshipType = reader.GetString(reader.GetOrdinal("ScholarshipType")),
            GradeAverage = reader.GetDecimal(reader.GetOrdinal("GradeAverage")),
            MinimumGradeAverage = reader.IsDBNull(reader.GetOrdinal("MinimumGradeAverage"))
                ? null
                : reader.GetDecimal(reader.GetOrdinal("MinimumGradeAverage")),
            Status = reader.GetString(reader.GetOrdinal("Status")),
            SubmittedAt = reader.GetDateTime(reader.GetOrdinal("SubmittedAt")),
        };

        if (!reader.IsDBNull(reader.GetOrdinal("Verdict")))
        {
            detail.Screening = new ScholarshipEligibilityScreening
            {
                ApplicationId = detail.ApplicationId,
                Verdict = reader.GetString(reader.GetOrdinal("Verdict")),
                Remarks = reader.IsDBNull(reader.GetOrdinal("Remarks")) ? null : reader.GetString(reader.GetOrdinal("Remarks")),
                EvaluatedByName = $"{reader.GetString(reader.GetOrdinal("EvaluatorFirstName"))} {reader.GetString(reader.GetOrdinal("EvaluatorLastName"))}",
                EvaluatedAt = reader.GetDateTime(reader.GetOrdinal("EvaluatedAt")),
            };
        }

        return detail;
    }
}
