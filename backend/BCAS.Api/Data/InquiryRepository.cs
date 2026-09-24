using System.Data;
using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class InquiryRepository : IInquiryRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public InquiryRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    private const string ThreadSelectColumns = @"
SELECT
    t.ThreadId, t.UserId, u.FirstName, u.LastName, u.Email, t.Subject, t.Status,
    t.HasUnreadForApplicant, t.HasUnreadForStaff, t.CreatedAt, t.UpdatedAt,
    lm.Body AS LastMessageBody, mc.MessageCount
FROM dbo.InquiryThreads t
JOIN dbo.Users u ON u.UserId = t.UserId
OUTER APPLY (
    SELECT TOP (1) im.Body
    FROM dbo.InquiryMessages im
    WHERE im.ThreadId = t.ThreadId
    ORDER BY im.CreatedAt DESC
) lm
CROSS APPLY (
    SELECT COUNT(*) AS MessageCount FROM dbo.InquiryMessages im2 WHERE im2.ThreadId = t.ThreadId
) mc";

    public async Task<Guid> CreateThreadAsync(Guid userId, string subject, string body, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var transaction = (SqlTransaction)await connection.BeginTransactionAsync(cancellationToken);

        try
        {
            const string insertThreadSql = @"
INSERT INTO dbo.InquiryThreads (UserId, Subject)
OUTPUT inserted.ThreadId
VALUES (@UserId, @Subject);";

            Guid threadId;
            await using (var command = new SqlCommand(insertThreadSql, connection, transaction))
            {
                command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
                command.Parameters.Add(new SqlParameter("@Subject", SqlDbType.NVarChar, 200) { Value = subject });
                threadId = (Guid)(await command.ExecuteScalarAsync(cancellationToken))!;
            }

            const string insertMessageSql = @"
INSERT INTO dbo.InquiryMessages (ThreadId, SenderUserId, IsFromStaff, Body)
VALUES (@ThreadId, @SenderUserId, 0, @Body);";

            await using (var command = new SqlCommand(insertMessageSql, connection, transaction))
            {
                command.Parameters.Add(new SqlParameter("@ThreadId", SqlDbType.UniqueIdentifier) { Value = threadId });
                command.Parameters.Add(new SqlParameter("@SenderUserId", SqlDbType.UniqueIdentifier) { Value = userId });
                command.Parameters.Add(new SqlParameter("@Body", SqlDbType.NVarChar, 2000) { Value = body });
                await command.ExecuteNonQueryAsync(cancellationToken);
            }

            await transaction.CommitAsync(cancellationToken);
            return threadId;
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

    public async Task<IReadOnlyList<InquiryThread>> GetThreadsByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        var sql = ThreadSelectColumns + @"
WHERE t.UserId = @UserId
ORDER BY t.UpdatedAt DESC;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });

        return await ReadThreadsAsync(command, cancellationToken);
    }

    public async Task<IReadOnlyList<InquiryThread>> GetQueueAsync(string? status, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        var sql = ThreadSelectColumns + @"
WHERE (@Status IS NULL OR t.Status = @Status)
ORDER BY t.UpdatedAt DESC;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Status", SqlDbType.NVarChar, 20)
        {
            Value = string.IsNullOrWhiteSpace(status) ? DBNull.Value : status,
        });

        return await ReadThreadsAsync(command, cancellationToken);
    }

    public async Task<InquiryThread?> GetByIdAsync(Guid threadId, Guid? ownerUserId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        var sql = ThreadSelectColumns + @"
WHERE t.ThreadId = @ThreadId AND (@OwnerUserId IS NULL OR t.UserId = @OwnerUserId);";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@ThreadId", SqlDbType.UniqueIdentifier) { Value = threadId });
        command.Parameters.Add(new SqlParameter("@OwnerUserId", SqlDbType.UniqueIdentifier)
        {
            Value = (object?)ownerUserId ?? DBNull.Value,
        });

        var results = await ReadThreadsAsync(command, cancellationToken);
        return results.Count > 0 ? results[0] : null;
    }

    public async Task<IReadOnlyList<InquiryMessage>> GetMessagesByThreadIdAsync(Guid threadId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT im.MessageId, im.ThreadId, im.SenderUserId, u.FirstName, u.LastName, im.IsFromStaff, im.Body, im.CreatedAt
FROM dbo.InquiryMessages im
JOIN dbo.Users u ON u.UserId = im.SenderUserId
WHERE im.ThreadId = @ThreadId
ORDER BY im.CreatedAt ASC;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@ThreadId", SqlDbType.UniqueIdentifier) { Value = threadId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var messages = new List<InquiryMessage>();
        while (await reader.ReadAsync(cancellationToken))
        {
            messages.Add(new InquiryMessage
            {
                MessageId = reader.GetGuid(reader.GetOrdinal("MessageId")),
                ThreadId = reader.GetGuid(reader.GetOrdinal("ThreadId")),
                SenderUserId = reader.GetGuid(reader.GetOrdinal("SenderUserId")),
                SenderName = $"{reader.GetString(reader.GetOrdinal("FirstName"))} {reader.GetString(reader.GetOrdinal("LastName"))}",
                IsFromStaff = reader.GetBoolean(reader.GetOrdinal("IsFromStaff")),
                Body = reader.GetString(reader.GetOrdinal("Body")),
                CreatedAt = reader.GetDateTime(reader.GetOrdinal("CreatedAt")),
            });
        }

        return messages;
    }

    public async Task<InquiryMessage> PostMessageAsync(
        Guid threadId, Guid senderUserId, bool isFromStaff, string body, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var transaction = (SqlTransaction)await connection.BeginTransactionAsync(cancellationToken);

        try
        {
            const string insertSql = @"
INSERT INTO dbo.InquiryMessages (ThreadId, SenderUserId, IsFromStaff, Body)
OUTPUT inserted.MessageId, inserted.CreatedAt
VALUES (@ThreadId, @SenderUserId, @IsFromStaff, @Body);";

            Guid messageId;
            DateTime createdAt;
            await using (var command = new SqlCommand(insertSql, connection, transaction))
            {
                command.Parameters.Add(new SqlParameter("@ThreadId", SqlDbType.UniqueIdentifier) { Value = threadId });
                command.Parameters.Add(new SqlParameter("@SenderUserId", SqlDbType.UniqueIdentifier) { Value = senderUserId });
                command.Parameters.Add(new SqlParameter("@IsFromStaff", SqlDbType.Bit) { Value = isFromStaff });
                command.Parameters.Add(new SqlParameter("@Body", SqlDbType.NVarChar, 2000) { Value = body });

                await using var reader = await command.ExecuteReaderAsync(cancellationToken);
                await reader.ReadAsync(cancellationToken);
                messageId = reader.GetGuid(reader.GetOrdinal("MessageId"));
                createdAt = reader.GetDateTime(reader.GetOrdinal("CreatedAt"));
            }

            // The poster's own unread flag is left untouched - only the
            // other side needs to be told "something new is here". An
            // applicant message also reopens the thread unconditionally;
            // a staff message never touches Status (see interface doc).
            var updateSql = isFromStaff
                ? "UPDATE dbo.InquiryThreads SET HasUnreadForApplicant = 1, UpdatedAt = SYSUTCDATETIME() WHERE ThreadId = @ThreadId;"
                : "UPDATE dbo.InquiryThreads SET HasUnreadForStaff = 1, Status = N'Open', UpdatedAt = SYSUTCDATETIME() WHERE ThreadId = @ThreadId;";

            await using (var command = new SqlCommand(updateSql, connection, transaction))
            {
                command.Parameters.Add(new SqlParameter("@ThreadId", SqlDbType.UniqueIdentifier) { Value = threadId });
                await command.ExecuteNonQueryAsync(cancellationToken);
            }

            await transaction.CommitAsync(cancellationToken);

            return new InquiryMessage
            {
                MessageId = messageId,
                ThreadId = threadId,
                SenderUserId = senderUserId,
                IsFromStaff = isFromStaff,
                Body = body,
                CreatedAt = createdAt,
            };
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

    public async Task MarkReadAsync(Guid threadId, bool forStaff, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        var sql = forStaff
            ? "UPDATE dbo.InquiryThreads SET HasUnreadForStaff = 0 WHERE ThreadId = @ThreadId;"
            : "UPDATE dbo.InquiryThreads SET HasUnreadForApplicant = 0 WHERE ThreadId = @ThreadId;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@ThreadId", SqlDbType.UniqueIdentifier) { Value = threadId });
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<InquiryThread?> SetStatusAsync(Guid threadId, string status, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
UPDATE dbo.InquiryThreads
SET Status = @Status, UpdatedAt = SYSUTCDATETIME()
WHERE ThreadId = @ThreadId;";

        await using (var command = new SqlCommand(sql, connection))
        {
            command.Parameters.Add(new SqlParameter("@Status", SqlDbType.NVarChar, 20) { Value = status });
            command.Parameters.Add(new SqlParameter("@ThreadId", SqlDbType.UniqueIdentifier) { Value = threadId });
            var rowsAffected = await command.ExecuteNonQueryAsync(cancellationToken);
            if (rowsAffected == 0)
            {
                return null;
            }
        }

        return await GetByIdAsync(threadId, null, cancellationToken);
    }

    private static async Task<IReadOnlyList<InquiryThread>> ReadThreadsAsync(SqlCommand command, CancellationToken cancellationToken)
    {
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var threads = new List<InquiryThread>();
        while (await reader.ReadAsync(cancellationToken))
        {
            var lastMessageBodyOrdinal = reader.GetOrdinal("LastMessageBody");
            threads.Add(new InquiryThread
            {
                ThreadId = reader.GetGuid(reader.GetOrdinal("ThreadId")),
                UserId = reader.GetGuid(reader.GetOrdinal("UserId")),
                ApplicantName = $"{reader.GetString(reader.GetOrdinal("FirstName"))} {reader.GetString(reader.GetOrdinal("LastName"))}",
                ApplicantEmail = reader.GetString(reader.GetOrdinal("Email")),
                Subject = reader.GetString(reader.GetOrdinal("Subject")),
                Status = reader.GetString(reader.GetOrdinal("Status")),
                HasUnreadForApplicant = reader.GetBoolean(reader.GetOrdinal("HasUnreadForApplicant")),
                HasUnreadForStaff = reader.GetBoolean(reader.GetOrdinal("HasUnreadForStaff")),
                CreatedAt = reader.GetDateTime(reader.GetOrdinal("CreatedAt")),
                UpdatedAt = reader.GetDateTime(reader.GetOrdinal("UpdatedAt")),
                LastMessagePreview = reader.IsDBNull(lastMessageBodyOrdinal) ? null : reader.GetString(lastMessageBodyOrdinal),
                MessageCount = reader.GetInt32(reader.GetOrdinal("MessageCount")),
            });
        }

        return threads;
    }
}
