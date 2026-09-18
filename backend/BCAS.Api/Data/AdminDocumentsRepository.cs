using System.Data;
using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class AdminDocumentsRepository : IAdminDocumentsRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public AdminDocumentsRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<AdminDocumentListItem>> SearchAsync(
        string? search,
        string? status,
        string? documentType,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SELECT
    d.DocumentId, d.UserId, u.FirstName, u.LastName, u.Email,
    d.DocumentType, d.FileName, d.Status, d.FlaggedReason, d.UploadedAt, d.UpdatedAt,
    d.ReviewedAt, ru.FirstName AS ReviewedByFirstName, ru.LastName AS ReviewedByLastName
FROM dbo.ApplicantDocuments d
JOIN dbo.Users u ON u.UserId = d.UserId
LEFT JOIN dbo.Users ru ON ru.UserId = d.ReviewedByUserId
WHERE (@Search IS NULL OR u.FirstName LIKE '%' + @Search + '%' OR u.LastName LIKE '%' + @Search + '%' OR u.Email LIKE '%' + @Search + '%')
  AND (@Status IS NULL OR d.Status = @Status)
  AND (@DocumentType IS NULL OR d.DocumentType = @DocumentType)
ORDER BY d.UploadedAt DESC;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Search", SqlDbType.NVarChar, 256) { Value = (object?)NullIfEmpty(search) ?? DBNull.Value });
        command.Parameters.Add(new SqlParameter("@Status", SqlDbType.NVarChar, 20) { Value = (object?)NullIfEmpty(status) ?? DBNull.Value });
        command.Parameters.Add(new SqlParameter("@DocumentType", SqlDbType.NVarChar, 30) { Value = (object?)NullIfEmpty(documentType) ?? DBNull.Value });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var items = new List<AdminDocumentListItem>();
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(MapItem(reader));
        }

        return items;
    }

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

    private static string? NullIfEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
