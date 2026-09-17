using System.Data;
using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class ApplicantProfileRepository : IApplicantProfileRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public ApplicantProfileRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<ApplicantProfile?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT u.UserId, u.FirstName, u.LastName, p.BirthDate, p.ContactNumber, p.AddressLine,
       p.City, p.Province, p.PostalCode, p.IsBcasian, p.UpdatedAt
FROM dbo.Users u
JOIN dbo.ApplicantProfiles p ON p.UserId = u.UserId
WHERE u.UserId = @UserId;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? MapProfile(reader) : null;
    }

    public async Task<bool> ExistsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = "SELECT 1 FROM dbo.ApplicantProfiles WHERE UserId = @UserId;";
        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is not null;
    }

    public async Task<ApplicantProfile> UpsertAsync(
        Guid userId,
        UpsertApplicantProfileRequest request,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var transaction = (SqlTransaction)await connection.BeginTransactionAsync(cancellationToken);

        try
        {
            const string updateUserSql = @"
UPDATE dbo.Users
SET FirstName = @FirstName, LastName = @LastName, UpdatedAt = SYSUTCDATETIME()
WHERE UserId = @UserId;";

            await using (var updateUserCommand = new SqlCommand(updateUserSql, connection, transaction))
            {
                updateUserCommand.Parameters.Add(new SqlParameter("@FirstName", SqlDbType.NVarChar, 100) { Value = request.FirstName });
                updateUserCommand.Parameters.Add(new SqlParameter("@LastName", SqlDbType.NVarChar, 100) { Value = request.LastName });
                updateUserCommand.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
                await updateUserCommand.ExecuteNonQueryAsync(cancellationToken);
            }

            const string upsertProfileSql = @"
MERGE dbo.ApplicantProfiles AS target
USING (SELECT @UserId AS UserId) AS source
ON target.UserId = source.UserId
WHEN MATCHED THEN
    UPDATE SET BirthDate = @BirthDate, ContactNumber = @ContactNumber, AddressLine = @AddressLine,
               City = @City, Province = @Province, PostalCode = @PostalCode, IsBcasian = @IsBcasian,
               UpdatedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
    INSERT (UserId, BirthDate, ContactNumber, AddressLine, City, Province, PostalCode, IsBcasian)
    VALUES (@UserId, @BirthDate, @ContactNumber, @AddressLine, @City, @Province, @PostalCode, @IsBcasian);";

            await using (var upsertCommand = new SqlCommand(upsertProfileSql, connection, transaction))
            {
                upsertCommand.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
                upsertCommand.Parameters.Add(new SqlParameter("@BirthDate", SqlDbType.Date) { Value = request.BirthDate!.Value.ToDateTime(TimeOnly.MinValue) });
                upsertCommand.Parameters.Add(new SqlParameter("@ContactNumber", SqlDbType.NVarChar, 30) { Value = request.ContactNumber });
                upsertCommand.Parameters.Add(new SqlParameter("@AddressLine", SqlDbType.NVarChar, 200) { Value = request.AddressLine });
                upsertCommand.Parameters.Add(new SqlParameter("@City", SqlDbType.NVarChar, 100) { Value = request.City });
                upsertCommand.Parameters.Add(new SqlParameter("@Province", SqlDbType.NVarChar, 100) { Value = request.Province });
                upsertCommand.Parameters.Add(new SqlParameter("@PostalCode", SqlDbType.NVarChar, 20) { Value = request.PostalCode });
                upsertCommand.Parameters.Add(new SqlParameter("@IsBcasian", SqlDbType.Bit) { Value = request.IsBcasian!.Value });
                await upsertCommand.ExecuteNonQueryAsync(cancellationToken);
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

        return (await GetByUserIdAsync(userId, cancellationToken))!;
    }

    private static ApplicantProfile MapProfile(SqlDataReader reader) => new()
    {
        UserId = reader.GetGuid(reader.GetOrdinal("UserId")),
        FirstName = reader.GetString(reader.GetOrdinal("FirstName")),
        LastName = reader.GetString(reader.GetOrdinal("LastName")),
        BirthDate = DateOnly.FromDateTime(reader.GetDateTime(reader.GetOrdinal("BirthDate"))),
        ContactNumber = reader.GetString(reader.GetOrdinal("ContactNumber")),
        AddressLine = reader.GetString(reader.GetOrdinal("AddressLine")),
        City = reader.GetString(reader.GetOrdinal("City")),
        Province = reader.GetString(reader.GetOrdinal("Province")),
        PostalCode = reader.GetString(reader.GetOrdinal("PostalCode")),
        IsBcasian = reader.GetBoolean(reader.GetOrdinal("IsBcasian")),
        UpdatedAt = reader.GetDateTime(reader.GetOrdinal("UpdatedAt")),
    };
}
