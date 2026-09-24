using System.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class ScholarshipApplicationRepository : IScholarshipApplicationRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public ScholarshipApplicationRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    /// <summary>
    /// Reserves a slot and inserts the application as "Submitted" if one's
    /// available; if the scholarship is active but full, inserts it as
    /// "Waitlisted" instead (no slot consumed) rather than blocking the
    /// submission outright. Still throws ScholarshipNotFoundException /
    /// ScholarshipNotAvailableException("inactive") for a scholarship that
    /// doesn't exist or isn't active - only "full" becomes a waitlist entry.
    /// </summary>
    public async Task<ScholarshipApplication> CreateAsync(
        Guid userId,
        int scholarshipId,
        decimal gradeAverage,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var transaction = (SqlTransaction)await connection.BeginTransactionAsync(cancellationToken);

        try
        {
            var reserved = await ReserveSlotAsync(connection, transaction, scholarshipId, cancellationToken);

            string scholarshipName;
            string scholarshipType;
            string status;
            if (reserved is not null)
            {
                (scholarshipName, scholarshipType) = reserved.Value;
                status = "Submitted";
            }
            else
            {
                var info = await GetActiveScholarshipInfoAsync(connection, transaction, scholarshipId, cancellationToken)
                    ?? throw new ScholarshipNotFoundException(scholarshipId);
                if (!info.IsActive)
                {
                    throw new ScholarshipNotAvailableException("This scholarship is no longer active.");
                }

                (scholarshipName, scholarshipType) = (info.Name, info.ScholarshipType);
                status = "Waitlisted";
            }

            var application = await InsertApplicationAsync(
                connection, transaction, userId, scholarshipId, scholarshipType, gradeAverage, status, cancellationToken);
            application.ScholarshipName = scholarshipName;

            await transaction.CommitAsync(cancellationToken);
            return application;
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
    }

    /// <summary>
    /// Releases a previously-reserved slot back (RemainingSlots + 1,
    /// capped at TotalSlots by the WHERE clause) for the scholarship behind
    /// the given application - called exactly once, when that application's
    /// Status transitions to "Rejected" (never on Approved - that consumer
    /// keeps the slot permanently - and never twice, since the ordered
    /// workflow's forward-only transitions make re-entering "Rejected"
    /// impossible). A no-op if the scholarship is already at TotalSlots
    /// (nothing to release, e.g. a Waitlisted application that never held
    /// a slot in the first place - callers don't need to check which case
    /// they're in first).
    /// </summary>
    public async Task ReleaseSlotByApplicationIdAsync(Guid applicationId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
UPDATE s
SET s.RemainingSlots = s.RemainingSlots + 1
FROM dbo.Scholarships s
JOIN dbo.ScholarshipApplications a ON a.ScholarshipId = s.ScholarshipId
WHERE a.ApplicationId = @ApplicationId AND s.RemainingSlots < s.TotalSlots;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = applicationId });
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    /// <summary>
    /// Promotes a waitlisted application: atomically reserves a slot on its
    /// scholarship and flips its Status from "Waitlisted" to "Submitted" in
    /// the same transaction, so the two can never drift (a slot reserved
    /// with no matching status flip, or vice versa). Returns null if the
    /// application doesn't exist or isn't currently "Waitlisted"; throws
    /// ScholarshipNotAvailableException if its scholarship still has no
    /// free slot (the application stays Waitlisted, nothing is rolled
    /// back except the attempted reservation itself).
    /// </summary>
    public async Task<ScholarshipApplication?> PromoteFromWaitlistAsync(Guid applicationId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var transaction = (SqlTransaction)await connection.BeginTransactionAsync(cancellationToken);

        try
        {
            const string lookupSql = @"
SELECT a.ScholarshipId, a.Status
FROM dbo.ScholarshipApplications a
WHERE a.ApplicationId = @ApplicationId;";

            int scholarshipId;
            await using (var lookupCommand = new SqlCommand(lookupSql, connection, transaction))
            {
                lookupCommand.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = applicationId });
                await using var reader = await lookupCommand.ExecuteReaderAsync(cancellationToken);
                if (!await reader.ReadAsync(cancellationToken))
                {
                    return null;
                }

                if (reader.GetString(reader.GetOrdinal("Status")) != "Waitlisted")
                {
                    return null;
                }

                scholarshipId = reader.GetInt32(reader.GetOrdinal("ScholarshipId"));
            }

            var reserved = await ReserveSlotAsync(connection, transaction, scholarshipId, cancellationToken)
                ?? throw new ScholarshipNotAvailableException("No remaining slots for this scholarship yet.");

            const string updateSql = @"
UPDATE dbo.ScholarshipApplications
SET Status = N'Submitted'
OUTPUT inserted.ApplicationId, inserted.UserId, inserted.ScholarshipId, inserted.ScholarshipType,
       inserted.GradeAverage, inserted.Status, inserted.SubmittedAt
WHERE ApplicationId = @ApplicationId;";

            await using var updateCommand = new SqlCommand(updateSql, connection, transaction);
            updateCommand.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = applicationId });

            await using var updateReader = await updateCommand.ExecuteReaderAsync(cancellationToken);
            await updateReader.ReadAsync(cancellationToken);

            // Same reasoning as InsertApplicationAsync: UPDATE...OUTPUT has
            // no ScholarshipName column (it isn't stored on this table), so
            // build the object field-by-field rather than reuse
            // MapApplication (which expects a joined ScholarshipName column
            // from GetByUserIdAsync's SELECT, not present here).
            var application = new ScholarshipApplication
            {
                ApplicationId = updateReader.GetGuid(updateReader.GetOrdinal("ApplicationId")),
                UserId = updateReader.GetGuid(updateReader.GetOrdinal("UserId")),
                ScholarshipId = updateReader.GetInt32(updateReader.GetOrdinal("ScholarshipId")),
                ScholarshipName = reserved.Name,
                ScholarshipType = updateReader.GetString(updateReader.GetOrdinal("ScholarshipType")),
                GradeAverage = updateReader.GetDecimal(updateReader.GetOrdinal("GradeAverage")),
                Status = updateReader.GetString(updateReader.GetOrdinal("Status")),
                SubmittedAt = updateReader.GetDateTime(updateReader.GetOrdinal("SubmittedAt")),
            };

            await transaction.CommitAsync(cancellationToken);
            return application;
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
    }

    public async Task<IReadOnlyList<ScholarshipApplication>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT a.ApplicationId, a.UserId, a.ScholarshipId, s.Name AS ScholarshipName, a.ScholarshipType,
       a.GradeAverage, a.Status, a.SubmittedAt
FROM dbo.ScholarshipApplications a
JOIN dbo.Scholarships s ON s.ScholarshipId = a.ScholarshipId
WHERE a.UserId = @UserId
ORDER BY a.SubmittedAt DESC;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var applications = new List<ScholarshipApplication>();
        while (await reader.ReadAsync(cancellationToken))
        {
            applications.Add(MapApplication(reader));
        }

        return applications;
    }

    /// <summary>
    /// Atomically decrements RemainingSlots iff the scholarship is active
    /// and has slots left. Returns the scholarship's (Name, Type) on
    /// success, or null if the conditional update matched no row.
    /// </summary>
    private static async Task<(string Name, string ScholarshipType)?> ReserveSlotAsync(
        SqlConnection connection, SqlTransaction transaction, int scholarshipId, CancellationToken cancellationToken)
    {
        const string sql = @"
UPDATE dbo.Scholarships
SET RemainingSlots = RemainingSlots - 1
OUTPUT inserted.Name, inserted.ScholarshipType
WHERE ScholarshipId = @ScholarshipId AND IsActive = 1 AND RemainingSlots > 0;";

        await using var command = new SqlCommand(sql, connection, transaction);
        command.Parameters.Add(new SqlParameter("@ScholarshipId", SqlDbType.Int) { Value = scholarshipId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return (reader.GetString(reader.GetOrdinal("Name")), reader.GetString(reader.GetOrdinal("ScholarshipType")));
    }

    /// <summary>
    /// Only called after a failed reservation, to decide whether that's
    /// because the scholarship is full (still worth a Waitlisted insert -
    /// see CreateAsync) or because it doesn't exist / isn't active (a real
    /// error). The reservation's own WHERE clause is what actually
    /// enforces slot correctness, so this read being a moment stale
    /// doesn't matter - it only ever gates which exception to throw, or
    /// whether to proceed with a waitlist entry instead.
    /// </summary>
    private static async Task<(bool IsActive, string Name, string ScholarshipType)?> GetActiveScholarshipInfoAsync(
        SqlConnection connection, SqlTransaction transaction, int scholarshipId, CancellationToken cancellationToken)
    {
        const string sql = "SELECT IsActive, Name, ScholarshipType FROM dbo.Scholarships WHERE ScholarshipId = @ScholarshipId;";
        await using var command = new SqlCommand(sql, connection, transaction);
        command.Parameters.Add(new SqlParameter("@ScholarshipId", SqlDbType.Int) { Value = scholarshipId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return (
            reader.GetBoolean(reader.GetOrdinal("IsActive")),
            reader.GetString(reader.GetOrdinal("Name")),
            reader.GetString(reader.GetOrdinal("ScholarshipType")));
    }

    private static async Task<ScholarshipApplication> InsertApplicationAsync(
        SqlConnection connection,
        SqlTransaction transaction,
        Guid userId,
        int scholarshipId,
        string scholarshipType,
        decimal gradeAverage,
        string status,
        CancellationToken cancellationToken)
    {
        const string sql = @"
INSERT INTO dbo.ScholarshipApplications (UserId, ScholarshipId, ScholarshipType, GradeAverage, Status)
OUTPUT
    inserted.ApplicationId, inserted.UserId, inserted.ScholarshipId, inserted.ScholarshipType,
    inserted.GradeAverage, inserted.Status, inserted.SubmittedAt
VALUES (@UserId, @ScholarshipId, @ScholarshipType, @GradeAverage, @Status);";

        await using var command = new SqlCommand(sql, connection, transaction);
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
        command.Parameters.Add(new SqlParameter("@ScholarshipId", SqlDbType.Int) { Value = scholarshipId });
        command.Parameters.Add(new SqlParameter("@ScholarshipType", SqlDbType.NVarChar, 100) { Value = scholarshipType });
        command.Parameters.Add(new SqlParameter("@GradeAverage", SqlDbType.Decimal) { Value = gradeAverage });
        command.Parameters.Add(new SqlParameter("@Status", SqlDbType.NVarChar, 30) { Value = status });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);

        // INSERT...OUTPUT has no ScholarshipName column (it isn't stored on
        // this table) - CreateAsync fills it in afterward from the
        // reservation step, which already looked it up.
        return new ScholarshipApplication
        {
            ApplicationId = reader.GetGuid(reader.GetOrdinal("ApplicationId")),
            UserId = reader.GetGuid(reader.GetOrdinal("UserId")),
            ScholarshipId = reader.GetInt32(reader.GetOrdinal("ScholarshipId")),
            ScholarshipType = reader.GetString(reader.GetOrdinal("ScholarshipType")),
            GradeAverage = reader.GetDecimal(reader.GetOrdinal("GradeAverage")),
            Status = reader.GetString(reader.GetOrdinal("Status")),
            SubmittedAt = reader.GetDateTime(reader.GetOrdinal("SubmittedAt")),
        };
    }

    private static ScholarshipApplication MapApplication(SqlDataReader reader) => new()
    {
        ApplicationId = reader.GetGuid(reader.GetOrdinal("ApplicationId")),
        UserId = reader.GetGuid(reader.GetOrdinal("UserId")),
        ScholarshipId = reader.GetInt32(reader.GetOrdinal("ScholarshipId")),
        ScholarshipName = reader.GetString(reader.GetOrdinal("ScholarshipName")),
        ScholarshipType = reader.GetString(reader.GetOrdinal("ScholarshipType")),
        GradeAverage = reader.GetDecimal(reader.GetOrdinal("GradeAverage")),
        Status = reader.GetString(reader.GetOrdinal("Status")),
        SubmittedAt = reader.GetDateTime(reader.GetOrdinal("SubmittedAt")),
    };
}
