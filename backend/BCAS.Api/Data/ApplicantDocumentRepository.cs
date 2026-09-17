using System.Data;
using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class ApplicantDocumentRepository : IApplicantDocumentRepository
{
    private const string MetadataColumns =
        "DocumentId, UserId, DocumentType, FileName, ContentType, FileSizeBytes, Status, FlaggedReason, UploadedAt, UpdatedAt";

    private readonly IDbConnectionFactory _connectionFactory;

    public ApplicantDocumentRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<ApplicantDocument>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        var sql = $@"
SELECT {MetadataColumns}
FROM dbo.ApplicantDocuments
WHERE UserId = @UserId;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var documents = new List<ApplicantDocument>();
        while (await reader.ReadAsync(cancellationToken))
        {
            documents.Add(MapDocument(reader));
        }

        return documents;
    }

    public async Task<ApplicantDocument> UpsertAsync(
        Guid userId,
        string documentType,
        string fileName,
        string contentType,
        byte[] fileData,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string upsertSql = @"
MERGE dbo.ApplicantDocuments AS target
USING (SELECT @UserId AS UserId, @DocumentType AS DocumentType) AS source
ON target.UserId = source.UserId AND target.DocumentType = source.DocumentType
WHEN MATCHED THEN
    UPDATE SET FileName = @FileName, ContentType = @ContentType, FileSizeBytes = @FileSizeBytes,
               FileData = @FileData, Status = N'Pending', FlaggedReason = NULL, UpdatedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
    INSERT (UserId, DocumentType, FileName, ContentType, FileSizeBytes, FileData)
    VALUES (@UserId, @DocumentType, @FileName, @ContentType, @FileSizeBytes, @FileData);";

        await using (var command = new SqlCommand(upsertSql, connection))
        {
            command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
            command.Parameters.Add(new SqlParameter("@DocumentType", SqlDbType.NVarChar, 30) { Value = documentType });
            command.Parameters.Add(new SqlParameter("@FileName", SqlDbType.NVarChar, 260) { Value = fileName });
            command.Parameters.Add(new SqlParameter("@ContentType", SqlDbType.NVarChar, 100) { Value = contentType });
            command.Parameters.Add(new SqlParameter("@FileSizeBytes", SqlDbType.Int) { Value = fileData.Length });
            command.Parameters.Add(new SqlParameter("@FileData", SqlDbType.VarBinary, -1) { Value = fileData });
            await command.ExecuteNonQueryAsync(cancellationToken);
        }

        var getSql = $@"
SELECT {MetadataColumns}
FROM dbo.ApplicantDocuments
WHERE UserId = @UserId AND DocumentType = @DocumentType;";

        await using var getCommand = new SqlCommand(getSql, connection);
        getCommand.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
        getCommand.Parameters.Add(new SqlParameter("@DocumentType", SqlDbType.NVarChar, 30) { Value = documentType });

        await using var reader = await getCommand.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);
        return MapDocument(reader);
    }

    private static ApplicantDocument MapDocument(SqlDataReader reader) => new()
    {
        DocumentId = reader.GetGuid(reader.GetOrdinal("DocumentId")),
        UserId = reader.GetGuid(reader.GetOrdinal("UserId")),
        DocumentType = reader.GetString(reader.GetOrdinal("DocumentType")),
        FileName = reader.GetString(reader.GetOrdinal("FileName")),
        ContentType = reader.GetString(reader.GetOrdinal("ContentType")),
        FileSizeBytes = reader.GetInt32(reader.GetOrdinal("FileSizeBytes")),
        Status = reader.GetString(reader.GetOrdinal("Status")),
        FlaggedReason = reader.IsDBNull(reader.GetOrdinal("FlaggedReason")) ? null : reader.GetString(reader.GetOrdinal("FlaggedReason")),
        UploadedAt = reader.GetDateTime(reader.GetOrdinal("UploadedAt")),
        UpdatedAt = reader.GetDateTime(reader.GetOrdinal("UpdatedAt")),
    };
}
