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

        EvaluatorScholarshipApplicationDetail? detail;

        const string sql = @"
SELECT
    sa.ApplicationId, sa.UserId, u.FirstName, u.LastName, u.Email,
    ap.IsBcasian,
    sa.ScholarshipId, sc.Name AS ScholarshipName, sa.ScholarshipType, sa.GradeAverage, sc.MinimumGradeAverage,
    sc.IsTopOne, sc.TotalSlots, sc.RemainingSlots,
    CAST(CASE WHEN EXISTS (SELECT 1 FROM dbo.ExamScheduleSelections ess WHERE ess.UserId = sa.UserId) THEN 1 ELSE 0 END AS BIT)
        AS EntranceExamScheduled,
    sa.Status, sa.SubmittedAt, sa.UpdatedAt,
    ses.Verdict, ses.Remarks, ses.EvaluatedAt,
    eu.FirstName AS EvaluatorFirstName, eu.LastName AS EvaluatorLastName,
    fd.Decision, fd.Remarks AS DecisionRemarks, fd.DecidedAt,
    du.FirstName AS DeciderFirstName, du.LastName AS DeciderLastName
FROM dbo.ScholarshipApplications sa
JOIN dbo.Users u ON u.UserId = sa.UserId
JOIN dbo.Scholarships sc ON sc.ScholarshipId = sa.ScholarshipId
LEFT JOIN dbo.ApplicantProfiles ap ON ap.UserId = sa.UserId
LEFT JOIN dbo.ScholarshipEligibilityScreenings ses ON ses.ApplicationId = sa.ApplicationId
LEFT JOIN dbo.Users eu ON eu.UserId = ses.EvaluatedByUserId
LEFT JOIN dbo.ScholarshipFinalDecisions fd ON fd.ApplicationId = sa.ApplicationId
LEFT JOIN dbo.Users du ON du.UserId = fd.DecidedByUserId
WHERE sa.ApplicationId = @ApplicationId;";

        await using (var command = new SqlCommand(sql, connection))
        {
            command.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = applicationId });

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            detail = await reader.ReadAsync(cancellationToken) ? MapDetail(reader) : null;
        }

        if (detail is null)
        {
            return null;
        }

        detail.EligibilityRules.PreviousAttempts = await GetPreviousAttemptsAsync(
            connection, applicationId, detail.UserId, detail.ScholarshipId, cancellationToken);
        detail.EligibilityRules.IsReapplication = detail.EligibilityRules.PreviousAttempts.Count > 0;

        return detail;
    }

    /// <summary>Every earlier application by the same applicant for the same scholarship, most recent first.</summary>
    private static async Task<IReadOnlyList<ScholarshipReapplicationAttempt>> GetPreviousAttemptsAsync(
        SqlConnection connection,
        Guid applicationId,
        Guid userId,
        int scholarshipId,
        CancellationToken cancellationToken)
    {
        const string sql = @"
SELECT sa.ApplicationId, sa.Status, sa.SubmittedAt, ses.Verdict, ses.Remarks
FROM dbo.ScholarshipApplications sa
LEFT JOIN dbo.ScholarshipEligibilityScreenings ses ON ses.ApplicationId = sa.ApplicationId
WHERE sa.UserId = @UserId AND sa.ScholarshipId = @ScholarshipId AND sa.ApplicationId <> @ApplicationId
ORDER BY sa.SubmittedAt DESC;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
        command.Parameters.Add(new SqlParameter("@ScholarshipId", SqlDbType.Int) { Value = scholarshipId });
        command.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = applicationId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var attempts = new List<ScholarshipReapplicationAttempt>();
        while (await reader.ReadAsync(cancellationToken))
        {
            attempts.Add(new ScholarshipReapplicationAttempt
            {
                ApplicationId = reader.GetGuid(reader.GetOrdinal("ApplicationId")),
                Status = reader.GetString(reader.GetOrdinal("Status")),
                SubmittedAt = reader.GetDateTime(reader.GetOrdinal("SubmittedAt")),
                ScreeningVerdict = reader.IsDBNull(reader.GetOrdinal("Verdict")) ? null : reader.GetString(reader.GetOrdinal("Verdict")),
                ScreeningRemarks = reader.IsDBNull(reader.GetOrdinal("Remarks")) ? null : reader.GetString(reader.GetOrdinal("Remarks")),
            });
        }

        return attempts;
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

    public async Task<EvaluatorScholarshipApplicationDetail?> AdvanceStatusAsync(
        Guid applicationId,
        string fromStatus,
        string toStatus,
        CancellationToken cancellationToken = default)
    {
        await using (var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken))
        {
            const string sql = @"
UPDATE dbo.ScholarshipApplications
SET Status = @ToStatus, UpdatedAt = SYSUTCDATETIME()
WHERE ApplicationId = @ApplicationId AND Status = @FromStatus;";

            await using var command = new SqlCommand(sql, connection);
            command.Parameters.Add(new SqlParameter("@ToStatus", SqlDbType.NVarChar, 30) { Value = toStatus });
            command.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = applicationId });
            command.Parameters.Add(new SqlParameter("@FromStatus", SqlDbType.NVarChar, 30) { Value = fromStatus });

            var rowsAffected = await command.ExecuteNonQueryAsync(cancellationToken);
            if (rowsAffected == 0)
            {
                return null;
            }
        }

        return await GetDetailAsync(applicationId, cancellationToken);
    }

    public async Task<EvaluatorScholarshipApplicationDetail?> RecordFinalDecisionAsync(
        Guid applicationId,
        string decision,
        string? remarks,
        Guid decidedByUserId,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var transaction = (SqlTransaction)await connection.BeginTransactionAsync(cancellationToken);

        try
        {
            // Only from Status = 'Result' - the guided workflow (BISAASS-43)
            // must have actually reached its last stage before a decision
            // can be confirmed. Conditional on the WHERE clause the same way
            // AdvanceStatusAsync is, so a concurrent decision (or workflow
            // change) can't race this into an inconsistent state.
            const string updateStatusSql = @"
UPDATE dbo.ScholarshipApplications
SET Status = @Decision, UpdatedAt = SYSUTCDATETIME()
WHERE ApplicationId = @ApplicationId AND Status = N'Result';";

            await using (var updateCommand = new SqlCommand(updateStatusSql, connection, transaction))
            {
                updateCommand.Parameters.Add(new SqlParameter("@Decision", SqlDbType.NVarChar, 20) { Value = decision });
                updateCommand.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = applicationId });

                var rowsAffected = await updateCommand.ExecuteNonQueryAsync(cancellationToken);
                if (rowsAffected == 0)
                {
                    await transaction.RollbackAsync(cancellationToken);
                    return null;
                }
            }

            const string mergeDecisionSql = @"
MERGE dbo.ScholarshipFinalDecisions AS target
USING (SELECT @ApplicationId AS ApplicationId) AS source
ON target.ApplicationId = source.ApplicationId
WHEN MATCHED THEN
    UPDATE SET Decision = @Decision, Remarks = @Remarks, DecidedByUserId = @DecidedByUserId, DecidedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
    INSERT (ApplicationId, Decision, Remarks, DecidedByUserId)
    VALUES (@ApplicationId, @Decision, @Remarks, @DecidedByUserId);";

            await using (var mergeCommand = new SqlCommand(mergeDecisionSql, connection, transaction))
            {
                mergeCommand.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = applicationId });
                mergeCommand.Parameters.Add(new SqlParameter("@Decision", SqlDbType.NVarChar, 20) { Value = decision });
                mergeCommand.Parameters.Add(new SqlParameter("@Remarks", SqlDbType.NVarChar, 1000) { Value = (object?)remarks ?? DBNull.Value });
                mergeCommand.Parameters.Add(new SqlParameter("@DecidedByUserId", SqlDbType.UniqueIdentifier) { Value = decidedByUserId });
                await mergeCommand.ExecuteNonQueryAsync(cancellationToken);
            }

            await transaction.CommitAsync(cancellationToken);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
        finally
        {
            await transaction.DisposeAsync();
        }

        return await GetDetailAsync(applicationId, cancellationToken);
    }

    /// <summary>Applications that have reached the final workflow stage (Result) and are awaiting an Academic Head's decision, oldest first.</summary>
    public async Task<IReadOnlyList<EvaluatorQueueApplication>> GetReadyForDecisionAsync(
        int take,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT TOP (@Take)
    sa.ApplicationId, u.FirstName, u.LastName, sc.Name AS ScholarshipName, sa.ScholarshipType, sa.GradeAverage, sa.Status, sa.SubmittedAt
FROM dbo.ScholarshipApplications sa
JOIN dbo.Users u ON u.UserId = sa.UserId
JOIN dbo.Scholarships sc ON sc.ScholarshipId = sa.ScholarshipId
WHERE sa.Status = N'Result'
ORDER BY sa.UpdatedAt ASC;";

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

    private static EvaluatorScholarshipApplicationDetail MapDetail(SqlDataReader reader)
    {
        var detail = new EvaluatorScholarshipApplicationDetail
        {
            ApplicationId = reader.GetGuid(reader.GetOrdinal("ApplicationId")),
            UserId = reader.GetGuid(reader.GetOrdinal("UserId")),
            ApplicantName = $"{reader.GetString(reader.GetOrdinal("FirstName"))} {reader.GetString(reader.GetOrdinal("LastName"))}",
            ApplicantEmail = reader.GetString(reader.GetOrdinal("Email")),
            IsBcasian = reader.IsDBNull(reader.GetOrdinal("IsBcasian")) ? null : reader.GetBoolean(reader.GetOrdinal("IsBcasian")),
            ScholarshipId = reader.GetInt32(reader.GetOrdinal("ScholarshipId")),
            ScholarshipName = reader.GetString(reader.GetOrdinal("ScholarshipName")),
            ScholarshipType = reader.GetString(reader.GetOrdinal("ScholarshipType")),
            GradeAverage = reader.GetDecimal(reader.GetOrdinal("GradeAverage")),
            MinimumGradeAverage = reader.IsDBNull(reader.GetOrdinal("MinimumGradeAverage"))
                ? null
                : reader.GetDecimal(reader.GetOrdinal("MinimumGradeAverage")),
            Status = reader.GetString(reader.GetOrdinal("Status")),
            SubmittedAt = reader.GetDateTime(reader.GetOrdinal("SubmittedAt")),
            UpdatedAt = reader.GetDateTime(reader.GetOrdinal("UpdatedAt")),
        };

        var isTopOne = reader.GetBoolean(reader.GetOrdinal("IsTopOne"));
        detail.EligibilityRules = new ScholarshipEligibilityRules
        {
            IsTopOne = isTopOne,
            // Waived entirely for Top 1 regardless of BCASian status; for
            // every other scholarship it's required exactly for non-BCASian
            // applicants. Null (not just false) when BCASian status itself
            // is unknown, so the UI can distinguish "not required" from
            // "can't tell yet".
            EntranceExamRequired = isTopOne ? false : (detail.IsBcasian.HasValue ? !detail.IsBcasian.Value : null),
            EntranceExamScheduled = reader.GetBoolean(reader.GetOrdinal("EntranceExamScheduled")),
            TotalSlots = reader.GetInt32(reader.GetOrdinal("TotalSlots")),
            RemainingSlots = reader.GetInt32(reader.GetOrdinal("RemainingSlots")),
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

        if (!reader.IsDBNull(reader.GetOrdinal("Decision")))
        {
            detail.FinalDecision = new ScholarshipFinalDecision
            {
                ApplicationId = detail.ApplicationId,
                Decision = reader.GetString(reader.GetOrdinal("Decision")),
                Remarks = reader.IsDBNull(reader.GetOrdinal("DecisionRemarks")) ? null : reader.GetString(reader.GetOrdinal("DecisionRemarks")),
                DecidedByName = $"{reader.GetString(reader.GetOrdinal("DeciderFirstName"))} {reader.GetString(reader.GetOrdinal("DeciderLastName"))}",
                DecidedAt = reader.GetDateTime(reader.GetOrdinal("DecidedAt")),
            };
        }

        return detail;
    }
}
