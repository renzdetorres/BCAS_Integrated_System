using System.Data;
using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class SupportStaffDocumentsRepository : ISupportStaffDocumentsRepository
{
    private const string SelectColumns = @"
    d.DocumentId, d.UserId, u.FirstName, u.LastName, u.Email,
    d.DocumentType, d.FileName, d.Status, d.FlaggedReason, d.UploadedAt, d.UpdatedAt,
    d.ReviewedAt, ru.FirstName AS ReviewedByFirstName, ru.LastName AS ReviewedByLastName";

    private const string FromClause = @"
FROM dbo.ApplicantDocuments d
JOIN dbo.Users u ON u.UserId = d.UserId
LEFT JOIN dbo.Users ru ON ru.UserId = d.ReviewedByUserId";

    private readonly IDbConnectionFactory _connectionFactory;

    public SupportStaffDocumentsRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<AdminDocumentListItem>> GetPendingAndFlaggedAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        var sql = $@"
SELECT {SelectColumns}
{FromClause}
WHERE d.Status IN (N'Pending', N'Flagged') AND d.IsArchived = 0
ORDER BY d.UploadedAt DESC;";

        await using var command = new SqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var items = new List<AdminDocumentListItem>();
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(MapItem(reader));
        }

        return items;
    }

    public async Task<IReadOnlyList<AdminDocumentListItem>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        var sql = $@"
SELECT {SelectColumns}
{FromClause}
WHERE d.UserId = @UserId AND d.IsArchived = 0
ORDER BY d.UploadedAt DESC;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var items = new List<AdminDocumentListItem>();
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(MapItem(reader));
        }

        return items;
    }

    public async Task<AdminDocumentListItem?> ReviewAsync(
        Guid documentId,
        string status,
        string? reason,
        Guid reviewedByUserId,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string updateSql = @"
UPDATE dbo.ApplicantDocuments
SET Status = @Status,
    FlaggedReason = @Reason,
    ReviewedByUserId = @ReviewedByUserId,
    ReviewedAt = SYSUTCDATETIME(),
    UpdatedAt = SYSUTCDATETIME()
WHERE DocumentId = @DocumentId;";

        await using (var command = new SqlCommand(updateSql, connection))
        {
            command.Parameters.Add(new SqlParameter("@Status", SqlDbType.NVarChar, 20) { Value = status });
            command.Parameters.Add(new SqlParameter("@Reason", SqlDbType.NVarChar, 500) { Value = (object?)reason ?? DBNull.Value });
            command.Parameters.Add(new SqlParameter("@ReviewedByUserId", SqlDbType.UniqueIdentifier) { Value = reviewedByUserId });
            command.Parameters.Add(new SqlParameter("@DocumentId", SqlDbType.UniqueIdentifier) { Value = documentId });

            var rowsAffected = await command.ExecuteNonQueryAsync(cancellationToken);
            if (rowsAffected == 0)
            {
                return null;
            }
        }

        var selectSql = $@"
SELECT {SelectColumns}
{FromClause}
WHERE d.DocumentId = @DocumentId;";

        await using var selectCommand = new SqlCommand(selectSql, connection);
        selectCommand.Parameters.Add(new SqlParameter("@DocumentId", SqlDbType.UniqueIdentifier) { Value = documentId });

        await using var reader = await selectCommand.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? MapItem(reader) : null;
    }

    public async Task<IReadOnlyList<AdminDocumentListItem>> SearchArchivedAsync(
        string? search, string? documentType, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        var sql = $@"
SELECT {SelectColumns}
{FromClause}
WHERE d.IsArchived = 1
  AND (@Search IS NULL OR u.FirstName LIKE '%' + @Search + '%' OR u.LastName LIKE '%' + @Search + '%' OR u.Email LIKE '%' + @Search + '%')
  AND (@DocumentType IS NULL OR d.DocumentType = @DocumentType)
ORDER BY d.UpdatedAt DESC;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Search", SqlDbType.NVarChar, 256) { Value = (object?)NullIfEmpty(search) ?? DBNull.Value });
        command.Parameters.Add(new SqlParameter("@DocumentType", SqlDbType.NVarChar, 30) { Value = (object?)NullIfEmpty(documentType) ?? DBNull.Value });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var items = new List<AdminDocumentListItem>();
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(MapItem(reader));
        }

        return items;
    }

    private static string? NullIfEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static AdminDocumentListItem MapItem(SqlDataReader reader)
    {
        var reviewedByFirstNameOrdinal = reader.GetOrdinal("ReviewedByFirstName");

        return new AdminDocumentListItem
        {
            DocumentId = reader.GetGuid(reader.GetOrdinal("DocumentId")),
            UserId = reader.GetGuid(reader.GetOrdinal("UserId")),
            ApplicantName = $"{reader.GetString(reader.GetOrdinal("FirstName"))} {reader.GetString(reader.GetOrdinal("LastName"))}",
            ApplicantEmail = reader.GetString(reader.GetOrdinal("Email")),
            DocumentType = reader.GetString(reader.GetOrdinal("DocumentType")),
            FileName = reader.GetString(reader.GetOrdinal("FileName")),
            Status = reader.GetString(reader.GetOrdinal("Status")),
            FlaggedReason = reader.IsDBNull(reader.GetOrdinal("FlaggedReason")) ? null : reader.GetString(reader.GetOrdinal("FlaggedReason")),
            UploadedAt = reader.GetDateTime(reader.GetOrdinal("UploadedAt")),
            UpdatedAt = reader.GetDateTime(reader.GetOrdinal("UpdatedAt")),
            ReviewedAt = reader.IsDBNull(reader.GetOrdinal("ReviewedAt")) ? null : reader.GetDateTime(reader.GetOrdinal("ReviewedAt")),
            ReviewedByName = reader.IsDBNull(reviewedByFirstNameOrdinal)
                ? null
                : $"{reader.GetString(reviewedByFirstNameOrdinal)} {reader.GetString(reader.GetOrdinal("ReviewedByLastName"))}",
        };
    }
}
