using System.Data;
using BCAS.Api.Constants;
using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class DuplicateApplicantRepository : IDuplicateApplicantRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public DuplicateApplicantRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<(Guid UserId, string FirstName, string LastName, string Email)>> FindNameMatchesAsync(
        string firstName, string lastName, Guid excludeUserId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT TOP (5) u.UserId, u.FirstName, u.LastName, u.Email
FROM dbo.Users u
JOIN dbo.Roles r ON r.RoleId = u.RoleId
WHERE r.RoleName = N'Applicant'
  AND u.UserId <> @ExcludeUserId
  AND DIFFERENCE(u.FirstName, @FirstName) >= @Threshold
  AND DIFFERENCE(u.LastName, @LastName) >= @Threshold
ORDER BY u.CreatedAt ASC;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@ExcludeUserId", SqlDbType.UniqueIdentifier) { Value = excludeUserId });
        command.Parameters.Add(new SqlParameter("@FirstName", SqlDbType.NVarChar, 100) { Value = firstName });
        command.Parameters.Add(new SqlParameter("@LastName", SqlDbType.NVarChar, 100) { Value = lastName });
        command.Parameters.Add(new SqlParameter("@Threshold", SqlDbType.Int) { Value = DuplicateApplicantConstants.NameDifferenceThreshold });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var matches = new List<(Guid, string, string, string)>();
        while (await reader.ReadAsync(cancellationToken))
        {
            matches.Add((
                reader.GetGuid(reader.GetOrdinal("UserId")),
                reader.GetString(reader.GetOrdinal("FirstName")),
                reader.GetString(reader.GetOrdinal("LastName")),
                reader.GetString(reader.GetOrdinal("Email"))));
        }

        return matches;
    }

    public async Task InsertFlagAsync(Guid newUserId, Guid matchedUserId, string matchReason, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
INSERT INTO dbo.PotentialDuplicateApplicants (NewUserId, MatchedUserId, MatchReason)
VALUES (@NewUserId, @MatchedUserId, @MatchReason);";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@NewUserId", SqlDbType.UniqueIdentifier) { Value = newUserId });
        command.Parameters.Add(new SqlParameter("@MatchedUserId", SqlDbType.UniqueIdentifier) { Value = matchedUserId });
        command.Parameters.Add(new SqlParameter("@MatchReason", SqlDbType.NVarChar, 200) { Value = matchReason });

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<PotentialDuplicateApplicant>> GetOpenFlagsAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT f.FlagId, f.MatchReason, f.Status, f.DetectedAt, f.ReviewNotes, f.ReviewedAt,
       nu.UserId AS NewUserId, nu.FirstName AS NewFirstName, nu.LastName AS NewLastName, nu.Email AS NewEmail,
       mu.UserId AS MatchedUserId, mu.FirstName AS MatchedFirstName, mu.LastName AS MatchedLastName, mu.Email AS MatchedEmail,
       ru.FirstName AS ReviewerFirstName, ru.LastName AS ReviewerLastName,
       app.ApplicationId AS MatchedApplicationId, app.Status AS MatchedApplicationStatus,
       app.CourseAppliedFor AS MatchedCourse, app.Department AS MatchedDepartment, app.SubmittedAt AS MatchedSubmittedAt,
       docs.Uploaded AS MatchedDocumentsUploaded, docs.Verified AS MatchedDocumentsVerified
FROM dbo.PotentialDuplicateApplicants f
JOIN dbo.Users nu ON nu.UserId = f.NewUserId
JOIN dbo.Users mu ON mu.UserId = f.MatchedUserId
LEFT JOIN dbo.Users ru ON ru.UserId = f.ReviewedByUserId
OUTER APPLY (
    SELECT TOP (1) aa.ApplicationId, aa.Status, aa.CourseAppliedFor, aa.Department, aa.SubmittedAt
    FROM dbo.AdmissionApplications aa
    WHERE aa.UserId = mu.UserId
    ORDER BY aa.SubmittedAt DESC
) app
OUTER APPLY (
    SELECT COUNT(*) AS Uploaded, COALESCE(SUM(CASE WHEN d.Status = N'Verified' THEN 1 ELSE 0 END), 0) AS Verified
    FROM dbo.ApplicantDocuments d
    WHERE d.UserId = mu.UserId AND d.IsArchived = 0
) docs
WHERE f.Status = N'Open'
ORDER BY f.DetectedAt DESC;";

        await using var command = new SqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var flags = new List<PotentialDuplicateApplicant>();
        while (await reader.ReadAsync(cancellationToken))
        {
            flags.Add(MapFlag(reader));
        }

        return flags;
    }

    public async Task<PotentialDuplicateApplicant?> ResolveFlagAsync(
        Guid flagId, string status, string? notes, Guid reviewedByUserId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        // The Status = N'Open' guard means a flag someone else already
        // resolved (a race, or a stale UI) updates zero rows rather than
        // silently overwriting their resolution - checked via rows-affected
        // before the separate fetch below, so a no-op update can't be
        // mistaken for success.
        const string updateSql = @"
UPDATE dbo.PotentialDuplicateApplicants
SET Status = @Status,
    ReviewNotes = @ReviewNotes,
    ReviewedByUserId = @ReviewedByUserId,
    ReviewedAt = SYSUTCDATETIME()
WHERE FlagId = @FlagId AND Status = N'Open';";

        await using var updateCommand = new SqlCommand(updateSql, connection);
        updateCommand.Parameters.Add(new SqlParameter("@FlagId", SqlDbType.UniqueIdentifier) { Value = flagId });
        updateCommand.Parameters.Add(new SqlParameter("@Status", SqlDbType.NVarChar, 20) { Value = status });
        updateCommand.Parameters.Add(new SqlParameter("@ReviewNotes", SqlDbType.NVarChar, 500) { Value = (object?)notes ?? DBNull.Value });
        updateCommand.Parameters.Add(new SqlParameter("@ReviewedByUserId", SqlDbType.UniqueIdentifier) { Value = reviewedByUserId });

        var rowsAffected = await updateCommand.ExecuteNonQueryAsync(cancellationToken);
        if (rowsAffected == 0)
        {
            return null;
        }

        const string selectSql = @"
SELECT f.FlagId, f.MatchReason, f.Status, f.DetectedAt, f.ReviewNotes, f.ReviewedAt,
       nu.UserId AS NewUserId, nu.FirstName AS NewFirstName, nu.LastName AS NewLastName, nu.Email AS NewEmail,
       mu.UserId AS MatchedUserId, mu.FirstName AS MatchedFirstName, mu.LastName AS MatchedLastName, mu.Email AS MatchedEmail,
       ru.FirstName AS ReviewerFirstName, ru.LastName AS ReviewerLastName,
       app.ApplicationId AS MatchedApplicationId, app.Status AS MatchedApplicationStatus,
       app.CourseAppliedFor AS MatchedCourse, app.Department AS MatchedDepartment, app.SubmittedAt AS MatchedSubmittedAt,
       docs.Uploaded AS MatchedDocumentsUploaded, docs.Verified AS MatchedDocumentsVerified
FROM dbo.PotentialDuplicateApplicants f
JOIN dbo.Users nu ON nu.UserId = f.NewUserId
JOIN dbo.Users mu ON mu.UserId = f.MatchedUserId
LEFT JOIN dbo.Users ru ON ru.UserId = f.ReviewedByUserId
OUTER APPLY (
    SELECT TOP (1) aa.ApplicationId, aa.Status, aa.CourseAppliedFor, aa.Department, aa.SubmittedAt
    FROM dbo.AdmissionApplications aa
    WHERE aa.UserId = mu.UserId
    ORDER BY aa.SubmittedAt DESC
) app
OUTER APPLY (
    SELECT COUNT(*) AS Uploaded, COALESCE(SUM(CASE WHEN d.Status = N'Verified' THEN 1 ELSE 0 END), 0) AS Verified
    FROM dbo.ApplicantDocuments d
    WHERE d.UserId = mu.UserId AND d.IsArchived = 0
) docs
WHERE f.FlagId = @FlagId;";

        await using var selectCommand = new SqlCommand(selectSql, connection);
        selectCommand.Parameters.Add(new SqlParameter("@FlagId", SqlDbType.UniqueIdentifier) { Value = flagId });

        await using var reader = await selectCommand.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? MapFlag(reader) : null;
    }

    private static PotentialDuplicateApplicant MapFlag(SqlDataReader reader) => new()
    {
        FlagId = reader.GetGuid(reader.GetOrdinal("FlagId")),
        NewUserId = reader.GetGuid(reader.GetOrdinal("NewUserId")),
        NewUserName = $"{reader.GetString(reader.GetOrdinal("NewFirstName"))} {reader.GetString(reader.GetOrdinal("NewLastName"))}",
        NewUserEmail = reader.GetString(reader.GetOrdinal("NewEmail")),
        MatchedUserId = reader.GetGuid(reader.GetOrdinal("MatchedUserId")),
        MatchedUserName = $"{reader.GetString(reader.GetOrdinal("MatchedFirstName"))} {reader.GetString(reader.GetOrdinal("MatchedLastName"))}",
        MatchedUserEmail = reader.GetString(reader.GetOrdinal("MatchedEmail")),
        MatchReason = reader.GetString(reader.GetOrdinal("MatchReason")),
        Status = reader.GetString(reader.GetOrdinal("Status")),
        DetectedAt = reader.GetDateTime(reader.GetOrdinal("DetectedAt")),
        ReviewedByName = reader.IsDBNull(reader.GetOrdinal("ReviewerFirstName"))
            ? null
            : $"{reader.GetString(reader.GetOrdinal("ReviewerFirstName"))} {reader.GetString(reader.GetOrdinal("ReviewerLastName"))}",
        ReviewedAt = reader.IsDBNull(reader.GetOrdinal("ReviewedAt")) ? null : reader.GetDateTime(reader.GetOrdinal("ReviewedAt")),
        ReviewNotes = reader.IsDBNull(reader.GetOrdinal("ReviewNotes")) ? null : reader.GetString(reader.GetOrdinal("ReviewNotes")),
        MatchedApplicationId = reader.IsDBNull(reader.GetOrdinal("MatchedApplicationId")) ? null : reader.GetGuid(reader.GetOrdinal("MatchedApplicationId")),
        MatchedApplicationStatus = reader.IsDBNull(reader.GetOrdinal("MatchedApplicationStatus")) ? null : reader.GetString(reader.GetOrdinal("MatchedApplicationStatus")),
        MatchedCourseAppliedFor = reader.IsDBNull(reader.GetOrdinal("MatchedCourse")) ? null : reader.GetString(reader.GetOrdinal("MatchedCourse")),
        MatchedDepartment = reader.IsDBNull(reader.GetOrdinal("MatchedDepartment")) ? null : reader.GetString(reader.GetOrdinal("MatchedDepartment")),
        MatchedSubmittedAt = reader.IsDBNull(reader.GetOrdinal("MatchedSubmittedAt")) ? null : reader.GetDateTime(reader.GetOrdinal("MatchedSubmittedAt")),
        MatchedDocumentsUploaded = reader.GetInt32(reader.GetOrdinal("MatchedDocumentsUploaded")),
        MatchedDocumentsVerified = reader.GetInt32(reader.GetOrdinal("MatchedDocumentsVerified")),
    };
}
