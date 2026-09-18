using System.Data;
using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class AdminReservationRepository : IAdminReservationRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public AdminReservationRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<AdminReservationCandidate>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = SelectColumns + @"
FROM dbo.AdmissionApplications a
JOIN dbo.Users u ON u.UserId = a.UserId
LEFT JOIN dbo.AdmissionReservations r ON r.ApplicationId = a.ApplicationId
LEFT JOIN dbo.Users ru ON ru.UserId = r.RecordedByUserId
WHERE a.Status = N'Approved'
ORDER BY a.SubmittedAt DESC;";

        await using var command = new SqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var candidates = new List<AdminReservationCandidate>();
        while (await reader.ReadAsync(cancellationToken))
        {
            candidates.Add(MapCandidate(reader));
        }

        return candidates;
    }

    public async Task<AdminReservationCandidate?> GetByApplicationIdAsync(Guid applicationId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = SelectColumns + @"
FROM dbo.AdmissionApplications a
JOIN dbo.Users u ON u.UserId = a.UserId
LEFT JOIN dbo.AdmissionReservations r ON r.ApplicationId = a.ApplicationId
LEFT JOIN dbo.Users ru ON ru.UserId = r.RecordedByUserId
WHERE a.ApplicationId = @ApplicationId;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = applicationId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? MapCandidate(reader) : null;
    }

    public async Task<AdminReservationCandidate> UpsertReservationAsync(
        Guid applicationId,
        bool isReserved,
        decimal reservationFee,
        string? remarks,
        Guid recordedByUserId,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
MERGE dbo.AdmissionReservations AS target
USING (SELECT @ApplicationId AS ApplicationId) AS source
ON target.ApplicationId = source.ApplicationId
WHEN MATCHED THEN
    UPDATE SET IsReserved = @IsReserved, ReservationFee = @ReservationFee, Remarks = @Remarks,
               RecordedByUserId = @RecordedByUserId, RecordedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
    INSERT (ApplicationId, IsReserved, ReservationFee, Remarks, RecordedByUserId)
    VALUES (@ApplicationId, @IsReserved, @ReservationFee, @Remarks, @RecordedByUserId);";

        await using (var command = new SqlCommand(sql, connection))
        {
            command.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = applicationId });
            command.Parameters.Add(new SqlParameter("@IsReserved", SqlDbType.Bit) { Value = isReserved });
            command.Parameters.Add(new SqlParameter("@ReservationFee", SqlDbType.Decimal) { Value = reservationFee });
            command.Parameters.Add(new SqlParameter("@Remarks", SqlDbType.NVarChar, 500) { Value = (object?)remarks ?? DBNull.Value });
            command.Parameters.Add(new SqlParameter("@RecordedByUserId", SqlDbType.UniqueIdentifier) { Value = recordedByUserId });
            await command.ExecuteNonQueryAsync(cancellationToken);
        }

        return (await GetByApplicationIdAsync(applicationId, cancellationToken))!;
    }

    private const string SelectColumns = @"
SELECT
    a.ApplicationId, a.UserId, u.FirstName, u.LastName, u.Email,
    a.ApplicationType, a.CourseAppliedFor, a.Status, a.SubmittedAt,
    r.IsReserved, r.ReservationFee, r.Remarks, r.RecordedAt,
    ru.FirstName AS RecordedByFirstName, ru.LastName AS RecordedByLastName";

    private static AdminReservationCandidate MapCandidate(SqlDataReader reader)
    {
        var recordedByFirstNameOrdinal = reader.GetOrdinal("RecordedByFirstName");

        return new AdminReservationCandidate
        {
            ApplicationId = reader.GetGuid(reader.GetOrdinal("ApplicationId")),
            UserId = reader.GetGuid(reader.GetOrdinal("UserId")),
            ApplicantName = $"{reader.GetString(reader.GetOrdinal("FirstName"))} {reader.GetString(reader.GetOrdinal("LastName"))}",
            ApplicantEmail = reader.GetString(reader.GetOrdinal("Email")),
            ApplicationType = reader.GetString(reader.GetOrdinal("ApplicationType")),
            CourseAppliedFor = reader.GetString(reader.GetOrdinal("CourseAppliedFor")),
            Status = reader.GetString(reader.GetOrdinal("Status")),
            SubmittedAt = reader.GetDateTime(reader.GetOrdinal("SubmittedAt")),
            IsReserved = !reader.IsDBNull(reader.GetOrdinal("IsReserved")) && reader.GetBoolean(reader.GetOrdinal("IsReserved")),
            ReservationFee = reader.IsDBNull(reader.GetOrdinal("ReservationFee")) ? null : reader.GetDecimal(reader.GetOrdinal("ReservationFee")),
            Remarks = reader.IsDBNull(reader.GetOrdinal("Remarks")) ? null : reader.GetString(reader.GetOrdinal("Remarks")),
            RecordedAt = reader.IsDBNull(reader.GetOrdinal("RecordedAt")) ? null : reader.GetDateTime(reader.GetOrdinal("RecordedAt")),
            RecordedByName = reader.IsDBNull(recordedByFirstNameOrdinal)
                ? null
                : $"{reader.GetString(recordedByFirstNameOrdinal)} {reader.GetString(reader.GetOrdinal("RecordedByLastName"))}",
        };
    }
}
