using BCAS.Api.Exceptions;
using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class UserRepository : IUserRepository
{
    private const string ApplicantRoleName = "Applicant";

    private readonly IDbConnectionFactory _connectionFactory;

    public UserRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<bool> EmailExistsAsync(string email, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = "SELECT 1 FROM dbo.Users WHERE Email = @Email;";
        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Email", System.Data.SqlDbType.NVarChar, 256) { Value = email });

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is not null;
    }

    public async Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT u.UserId, u.FirstName, u.LastName, u.Email, u.PasswordHash, u.RoleId, r.RoleName, u.IsActive, u.CreatedAt
FROM dbo.Users u
JOIN dbo.Roles r ON r.RoleId = u.RoleId
WHERE u.Email = @Email;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Email", System.Data.SqlDbType.NVarChar, 256) { Value = email });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? MapUser(reader) : null;
    }

    public async Task<User?> GetByIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT u.UserId, u.FirstName, u.LastName, u.Email, u.PasswordHash, u.RoleId, r.RoleName, u.IsActive, u.CreatedAt
FROM dbo.Users u
JOIN dbo.Roles r ON r.RoleId = u.RoleId
WHERE u.UserId = @UserId;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@UserId", System.Data.SqlDbType.UniqueIdentifier) { Value = userId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? MapUser(reader) : null;
    }

    public Task<User> CreateApplicantAsync(
        string firstName,
        string lastName,
        string email,
        string passwordHash,
        CancellationToken cancellationToken = default) =>
        CreateUserAsync(firstName, lastName, email, passwordHash, ApplicantRoleName, cancellationToken);

    public Task<User> CreateStaffAsync(
        string firstName,
        string lastName,
        string email,
        string passwordHash,
        string roleName,
        CancellationToken cancellationToken = default) =>
        CreateUserAsync(firstName, lastName, email, passwordHash, roleName, cancellationToken);

    private async Task<User> CreateUserAsync(
        string firstName,
        string lastName,
        string email,
        string passwordHash,
        string roleName,
        CancellationToken cancellationToken)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
DECLARE @RoleId INT = (SELECT RoleId FROM dbo.Roles WHERE RoleName = @RoleName);

INSERT INTO dbo.Users (FirstName, LastName, Email, PasswordHash, RoleId)
OUTPUT
    inserted.UserId,
    inserted.FirstName,
    inserted.LastName,
    inserted.Email,
    inserted.PasswordHash,
    inserted.RoleId,
    @RoleName AS RoleName,
    inserted.IsActive,
    inserted.CreatedAt
VALUES (@FirstName, @LastName, @Email, @PasswordHash, @RoleId);";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@RoleName", System.Data.SqlDbType.NVarChar, 50) { Value = roleName });
        command.Parameters.Add(new SqlParameter("@FirstName", System.Data.SqlDbType.NVarChar, 100) { Value = firstName });
        command.Parameters.Add(new SqlParameter("@LastName", System.Data.SqlDbType.NVarChar, 100) { Value = lastName });
        command.Parameters.Add(new SqlParameter("@Email", System.Data.SqlDbType.NVarChar, 256) { Value = email });
        command.Parameters.Add(new SqlParameter("@PasswordHash", System.Data.SqlDbType.NVarChar, 200) { Value = passwordHash });

        try
        {
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                throw new InvalidOperationException("Failed to create the account.");
            }

            return MapUser(reader);
        }
        catch (SqlException ex) when (IsUniqueConstraintViolation(ex))
        {
            // Safety net against a race between the pre-check and the insert.
            throw new DuplicateEmailException(email);
        }
    }

    public async Task<IReadOnlyList<User>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT u.UserId, u.FirstName, u.LastName, u.Email, u.PasswordHash, u.RoleId, r.RoleName, u.IsActive, u.CreatedAt
FROM dbo.Users u
JOIN dbo.Roles r ON r.RoleId = u.RoleId
ORDER BY u.CreatedAt DESC;";

        await using var command = new SqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var users = new List<User>();
        while (await reader.ReadAsync(cancellationToken))
        {
            users.Add(MapUser(reader));
        }

        return users;
    }

    public async Task<User?> SetActiveStatusAsync(Guid userId, bool isActive, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
UPDATE u
SET u.IsActive = @IsActive,
    u.UpdatedAt = SYSUTCDATETIME()
OUTPUT
    inserted.UserId,
    inserted.FirstName,
    inserted.LastName,
    inserted.Email,
    inserted.PasswordHash,
    inserted.RoleId,
    r.RoleName,
    inserted.IsActive,
    inserted.CreatedAt
FROM dbo.Users u
JOIN dbo.Roles r ON r.RoleId = u.RoleId
WHERE u.UserId = @UserId;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@IsActive", System.Data.SqlDbType.Bit) { Value = isActive });
        command.Parameters.Add(new SqlParameter("@UserId", System.Data.SqlDbType.UniqueIdentifier) { Value = userId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? MapUser(reader) : null;
    }

    public async Task<User?> UpdateAsync(
        Guid userId,
        string firstName,
        string lastName,
        string email,
        string roleName,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
UPDATE u
SET u.FirstName = @FirstName,
    u.LastName = @LastName,
    u.Email = @Email,
    u.RoleId = (SELECT RoleId FROM dbo.Roles WHERE RoleName = @RoleName),
    u.UpdatedAt = SYSUTCDATETIME()
OUTPUT
    inserted.UserId,
    inserted.FirstName,
    inserted.LastName,
    inserted.Email,
    inserted.PasswordHash,
    inserted.RoleId,
    @RoleName AS RoleName,
    inserted.IsActive,
    inserted.CreatedAt
FROM dbo.Users u
WHERE u.UserId = @UserId;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@FirstName", System.Data.SqlDbType.NVarChar, 100) { Value = firstName });
        command.Parameters.Add(new SqlParameter("@LastName", System.Data.SqlDbType.NVarChar, 100) { Value = lastName });
        command.Parameters.Add(new SqlParameter("@Email", System.Data.SqlDbType.NVarChar, 256) { Value = email });
        command.Parameters.Add(new SqlParameter("@RoleName", System.Data.SqlDbType.NVarChar, 50) { Value = roleName });
        command.Parameters.Add(new SqlParameter("@UserId", System.Data.SqlDbType.UniqueIdentifier) { Value = userId });

        try
        {
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            return await reader.ReadAsync(cancellationToken) ? MapUser(reader) : null;
        }
        catch (SqlException ex) when (IsUniqueConstraintViolation(ex))
        {
            // Safety net against a race between the pre-check and the update.
            throw new DuplicateEmailException(email);
        }
    }

    public async Task<User?> UpdateProfileAsync(
        Guid userId,
        string firstName,
        string lastName,
        string email,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
UPDATE u
SET u.FirstName = @FirstName,
    u.LastName = @LastName,
    u.Email = @Email,
    u.UpdatedAt = SYSUTCDATETIME()
OUTPUT
    inserted.UserId,
    inserted.FirstName,
    inserted.LastName,
    inserted.Email,
    inserted.PasswordHash,
    inserted.RoleId,
    r.RoleName,
    inserted.IsActive,
    inserted.CreatedAt
FROM dbo.Users u
JOIN dbo.Roles r ON r.RoleId = u.RoleId
WHERE u.UserId = @UserId;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@FirstName", System.Data.SqlDbType.NVarChar, 100) { Value = firstName });
        command.Parameters.Add(new SqlParameter("@LastName", System.Data.SqlDbType.NVarChar, 100) { Value = lastName });
        command.Parameters.Add(new SqlParameter("@Email", System.Data.SqlDbType.NVarChar, 256) { Value = email });
        command.Parameters.Add(new SqlParameter("@UserId", System.Data.SqlDbType.UniqueIdentifier) { Value = userId });

        try
        {
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            return await reader.ReadAsync(cancellationToken) ? MapUser(reader) : null;
        }
        catch (SqlException ex) when (IsUniqueConstraintViolation(ex))
        {
            // Safety net against a race between the pre-check and the update.
            throw new DuplicateEmailException(email);
        }
    }

    public async Task UpdatePasswordHashAsync(Guid userId, string passwordHash, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
UPDATE dbo.Users
SET PasswordHash = @PasswordHash, UpdatedAt = SYSUTCDATETIME()
WHERE UserId = @UserId;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@PasswordHash", System.Data.SqlDbType.NVarChar, 200) { Value = passwordHash });
        command.Parameters.Add(new SqlParameter("@UserId", System.Data.SqlDbType.UniqueIdentifier) { Value = userId });
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static User MapUser(SqlDataReader reader) => new()
    {
        UserId = reader.GetGuid(reader.GetOrdinal("UserId")),
        FirstName = reader.GetString(reader.GetOrdinal("FirstName")),
        LastName = reader.GetString(reader.GetOrdinal("LastName")),
        Email = reader.GetString(reader.GetOrdinal("Email")),
        PasswordHash = reader.GetString(reader.GetOrdinal("PasswordHash")),
        RoleId = reader.GetInt32(reader.GetOrdinal("RoleId")),
        RoleName = reader.GetString(reader.GetOrdinal("RoleName")),
        IsActive = reader.GetBoolean(reader.GetOrdinal("IsActive")),
        CreatedAt = reader.GetDateTime(reader.GetOrdinal("CreatedAt")),
    };

    private static bool IsUniqueConstraintViolation(SqlException ex) =>
        ex.Number is 2601 or 2627;
}
