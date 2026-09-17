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
            if (reserved is null)
            {
                throw await BuildUnavailableExceptionAsync(connection, transaction, scholarshipId, cancellationToken);
            }

            var (scholarshipName, scholarshipType) = reserved.Value;
            var application = await InsertApplicationAsync(
                connection, transaction, userId, scholarshipId, scholarshipType, gradeAverage, cancellationToken);
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
    /// Only called after a failed reservation, purely to explain why - the
    /// reservation's own WHERE clause is what actually enforces correctness,
    /// so this read being a moment stale doesn't matter.
    /// </summary>
    private static async Task<Exception> BuildUnavailableExceptionAsync(
        SqlConnection connection, SqlTransaction transaction, int scholarshipId, CancellationToken cancellationToken)
    {
        const string sql = "SELECT IsActive, RemainingSlots FROM dbo.Scholarships WHERE ScholarshipId = @ScholarshipId;";
        await using var command = new SqlCommand(sql, connection, transaction);
        command.Parameters.Add(new SqlParameter("@ScholarshipId", SqlDbType.Int) { Value = scholarshipId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return new ScholarshipNotFoundException(scholarshipId);
        }

        var isActive = reader.GetBoolean(reader.GetOrdinal("IsActive"));
        return isActive
            ? new ScholarshipNotAvailableException("No remaining slots for this scholarship.")
            : new ScholarshipNotAvailableException("This scholarship is no longer active.");
    }

    private static async Task<ScholarshipApplication> InsertApplicationAsync(
        SqlConnection connection,
        SqlTransaction transaction,
        Guid userId,
        int scholarshipId,
        string scholarshipType,
        decimal gradeAverage,
        CancellationToken cancellationToken)
    {
        const string sql = @"
INSERT INTO dbo.ScholarshipApplications (UserId, ScholarshipId, ScholarshipType, GradeAverage)
OUTPUT
    inserted.ApplicationId, inserted.UserId, inserted.ScholarshipId, inserted.ScholarshipType,
    inserted.GradeAverage, inserted.Status, inserted.SubmittedAt
VALUES (@UserId, @ScholarshipId, @ScholarshipType, @GradeAverage);";

        await using var command = new SqlCommand(sql, connection, transaction);
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
        command.Parameters.Add(new SqlParameter("@ScholarshipId", SqlDbType.Int) { Value = scholarshipId });
        command.Parameters.Add(new SqlParameter("@ScholarshipType", SqlDbType.NVarChar, 100) { Value = scholarshipType });
        command.Parameters.Add(new SqlParameter("@GradeAverage", SqlDbType.Decimal) { Value = gradeAverage });

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
