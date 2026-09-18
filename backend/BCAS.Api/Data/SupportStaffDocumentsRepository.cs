using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class SupportStaffDocumentsRepository : ISupportStaffDocumentsRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public SupportStaffDocumentsRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<AdminDocumentListItem>> GetPendingAndFlaggedAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT
    d.DocumentId, d.UserId, u.FirstName, u.LastName, u.Email,
    d.DocumentType, d.FileName, d.Status, d.FlaggedReason, d.UploadedAt, d.UpdatedAt
FROM dbo.ApplicantDocuments d
JOIN dbo.Users u ON u.UserId = d.UserId
WHERE d.Status IN (N'Pending', N'Flagged') AND d.IsArchived = 0
ORDER BY d.UploadedAt DESC;";

        await using var command = new SqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var items = new List<AdminDocumentListItem>();
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(new AdminDocumentListItem
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
            });
        }

        return items;
    }
}
