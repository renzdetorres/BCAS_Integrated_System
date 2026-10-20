using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class PasswordResetTokenRepository : IPasswordResetTokenRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public PasswordResetTokenRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task InsertAsync(Guid userId, string tokenHash, DateTime expiresAtUtc, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        // Invalidate any still-outstanding tokens for this user first - only
        // the most recently requested reset link should ever work.
        const string sql = @"
UPDATE dbo.PasswordResetTokens
SET UsedAt = SYSUTCDATETIME()
WHERE UserId = @UserId AND UsedAt IS NULL;

INSERT INTO dbo.PasswordResetTokens (UserId, TokenHash, ExpiresAt)
VALUES (@UserId, @TokenHash, @ExpiresAt);";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@UserId", System.Data.SqlDbType.UniqueIdentifier) { Value = userId });
        command.Parameters.Add(new SqlParameter("@TokenHash", System.Data.SqlDbType.NVarChar, 128) { Value = tokenHash });
        command.Parameters.Add(new SqlParameter("@ExpiresAt", System.Data.SqlDbType.DateTime2) { Value = expiresAtUtc });

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<Guid?> GetValidUserIdAsync(string tokenHash, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT UserId
FROM dbo.PasswordResetTokens
WHERE TokenHash = @TokenHash AND UsedAt IS NULL AND ExpiresAt > SYSUTCDATETIME();";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@TokenHash", System.Data.SqlDbType.NVarChar, 128) { Value = tokenHash });

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is Guid userId ? userId : null;
    }

    public async Task MarkUsedAsync(string tokenHash, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
UPDATE dbo.PasswordResetTokens
SET UsedAt = SYSUTCDATETIME()
WHERE TokenHash = @TokenHash;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@TokenHash", System.Data.SqlDbType.NVarChar, 128) { Value = tokenHash });

        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}
