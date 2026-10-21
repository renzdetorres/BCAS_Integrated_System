using System.Data;
using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public interface IExamPaymentRepository
{
    Task<ExamPayment?> GetByApplicationAsync(Guid applicationId, CancellationToken cancellationToken = default);

    Task<ExamPayment?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Records (or replaces) the proof for an application's payment and puts
    /// it back to Pending. A Verified payment is left alone and null is
    /// returned.
    /// </summary>
    Task<ExamPayment?> UpsertProofAsync(
        Guid applicationId,
        Guid userId,
        decimal amount,
        string paymentType,
        string? referenceNumber,
        string fileName,
        string contentType,
        byte[] fileData,
        CancellationToken cancellationToken = default);

    Task<DocumentFile?> GetProofFileAsync(Guid paymentId, CancellationToken cancellationToken = default);

    /// <summary>The queue, Pending first; null status means every payment.</summary>
    Task<IReadOnlyList<ExamPaymentQueueItem>> GetQueueAsync(string? status, CancellationToken cancellationToken = default);

    Task<ExamPaymentQueueItem?> GetQueueItemAsync(Guid paymentId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Sets (or corrects) the sales invoice number of a Verified payment, and on the
    /// applicant's exam permit too if it has already been released. False if there is
    /// no Verified payment with that id.
    /// </summary>
    Task<bool> SetInvoiceAsync(Guid paymentId, string invoiceNumber, CancellationToken cancellationToken = default);

    /// <summary>
    /// Marks a Pending payment Verified or Rejected. False if there is no
    /// Pending payment with that id (missing, or already reviewed).
    /// </summary>
    Task<bool> ReviewAsync(
        Guid paymentId,
        Guid reviewerUserId,
        string status,
        string? rejectionReason,
        string? invoiceNumber,
        CancellationToken cancellationToken = default);
}

public class ExamPaymentRepository : IExamPaymentRepository
{
    private const string Columns =
        "PaymentId, ApplicationId, UserId, PaymentType, Amount, ReferenceNumber, ProofFileName, ProofContentType, ProofUploadedAt, Status, RejectionReason, InvoiceNumber, VerifiedAt";

    private readonly IDbConnectionFactory _connectionFactory;

    public ExamPaymentRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public Task<ExamPayment?> GetByApplicationAsync(Guid applicationId, CancellationToken cancellationToken = default) =>
        GetOneAsync("ApplicationId", applicationId, cancellationToken);

    public async Task<ExamPayment?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        var sql = $@"
SELECT TOP (1) {Columns}
FROM dbo.ExamPayments
WHERE UserId = @Id
ORDER BY CreatedAt DESC;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Id", SqlDbType.UniqueIdentifier) { Value = userId });
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? Map(reader) : null;
    }

    public async Task<ExamPayment?> UpsertProofAsync(
        Guid applicationId,
        Guid userId,
        decimal amount,
        string paymentType,
        string? referenceNumber,
        string fileName,
        string contentType,
        byte[] fileData,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
MERGE dbo.ExamPayments WITH (HOLDLOCK) AS target
USING (SELECT @ApplicationId AS ApplicationId) AS source
ON target.ApplicationId = source.ApplicationId
WHEN MATCHED AND target.Status <> N'Verified' THEN
    UPDATE SET Amount = @Amount, PaymentType = @PaymentType, ReferenceNumber = @ReferenceNumber, ProofFileName = @FileName,
               ProofContentType = @ContentType, ProofFileData = @FileData, ProofUploadedAt = SYSUTCDATETIME(),
               Status = N'Pending', RejectionReason = NULL, InvoiceNumber = NULL,
               VerifiedByUserId = NULL, VerifiedAt = NULL, UpdatedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
    INSERT (ApplicationId, UserId, Amount, PaymentType, ReferenceNumber, ProofFileName, ProofContentType, ProofFileData)
    VALUES (@ApplicationId, @UserId, @Amount, @PaymentType, @ReferenceNumber, @FileName, @ContentType, @FileData);";

        await using (var command = new SqlCommand(sql, connection))
        {
            command.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = applicationId });
            command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
            command.Parameters.Add(new SqlParameter("@Amount", SqlDbType.Decimal) { Precision = 10, Scale = 2, Value = amount });
            command.Parameters.Add(new SqlParameter("@PaymentType", SqlDbType.NVarChar, 30) { Value = paymentType });
            command.Parameters.Add(new SqlParameter("@ReferenceNumber", SqlDbType.NVarChar, 60) { Value = (object?)referenceNumber ?? DBNull.Value });
            command.Parameters.Add(new SqlParameter("@FileName", SqlDbType.NVarChar, 260) { Value = fileName });
            command.Parameters.Add(new SqlParameter("@ContentType", SqlDbType.NVarChar, 100) { Value = contentType });
            command.Parameters.Add(new SqlParameter("@FileData", SqlDbType.VarBinary, -1) { Value = fileData });
            await command.ExecuteNonQueryAsync(cancellationToken);
        }

        var payment = await GetByApplicationAsync(applicationId, cancellationToken);
        return payment is { Status: "Verified" } ? null : payment;
    }

    public async Task<DocumentFile?> GetProofFileAsync(Guid paymentId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = "SELECT ProofFileName, ProofContentType, ProofFileData FROM dbo.ExamPayments WHERE PaymentId = @Id;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Id", SqlDbType.UniqueIdentifier) { Value = paymentId });
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return new DocumentFile
        {
            FileName = reader.GetString(0),
            ContentType = reader.GetString(1),
            FileData = (byte[])reader["ProofFileData"],
        };
    }

    public async Task<IReadOnlyList<ExamPaymentQueueItem>> GetQueueAsync(string? status, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        var sql = QueueSelect + @"
WHERE (@Status IS NULL OR p.Status = @Status) AND a.IsArchived = 0
ORDER BY CASE p.Status WHEN N'Pending' THEN 0 ELSE 1 END, p.ProofUploadedAt DESC;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Status", SqlDbType.NVarChar, 20) { Value = (object?)status ?? DBNull.Value });
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var items = new List<ExamPaymentQueueItem>();
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(MapQueueItem(reader));
        }

        return items;
    }

    public async Task<ExamPaymentQueueItem?> GetQueueItemAsync(Guid paymentId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        await using var command = new SqlCommand(QueueSelect + " WHERE p.PaymentId = @Id;", connection);
        command.Parameters.Add(new SqlParameter("@Id", SqlDbType.UniqueIdentifier) { Value = paymentId });
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? MapQueueItem(reader) : null;
    }

    public async Task<bool> ReviewAsync(
        Guid paymentId,
        Guid reviewerUserId,
        string status,
        string? rejectionReason,
        string? invoiceNumber,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
UPDATE dbo.ExamPayments
SET Status = @Status, RejectionReason = @Reason, InvoiceNumber = @InvoiceNumber,
    VerifiedByUserId = @ReviewerUserId, VerifiedAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME()
WHERE PaymentId = @PaymentId AND Status = N'Pending';";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@PaymentId", SqlDbType.UniqueIdentifier) { Value = paymentId });
        command.Parameters.Add(new SqlParameter("@ReviewerUserId", SqlDbType.UniqueIdentifier) { Value = reviewerUserId });
        command.Parameters.Add(new SqlParameter("@Status", SqlDbType.NVarChar, 20) { Value = status });
        command.Parameters.Add(new SqlParameter("@Reason", SqlDbType.NVarChar, 500) { Value = (object?)rejectionReason ?? DBNull.Value });
        command.Parameters.Add(new SqlParameter("@InvoiceNumber", SqlDbType.NVarChar, 50) { Value = (object?)invoiceNumber ?? DBNull.Value });
        return await command.ExecuteNonQueryAsync(cancellationToken) == 1;
    }

    public async Task<bool> SetInvoiceAsync(Guid paymentId, string invoiceNumber, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = @"
SET XACT_ABORT ON;
BEGIN TRAN;
UPDATE dbo.ExamPayments SET InvoiceNumber = @InvoiceNumber, UpdatedAt = SYSUTCDATETIME()
WHERE PaymentId = @PaymentId AND Status = N'Verified';
DECLARE @Updated INT = @@ROWCOUNT;
IF @Updated = 1
    UPDATE sel SET InvoiceNumber = @InvoiceNumber
    FROM dbo.ExamScheduleSelections sel
    JOIN dbo.ExamPayments p ON p.UserId = sel.UserId
    WHERE p.PaymentId = @PaymentId AND sel.IsPermitReleased = 1 AND sel.ExamType = N'Entrance Exam';
COMMIT;
SELECT @Updated;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@PaymentId", SqlDbType.UniqueIdentifier) { Value = paymentId });
        command.Parameters.Add(new SqlParameter("@InvoiceNumber", SqlDbType.NVarChar, 50) { Value = invoiceNumber });
        return Convert.ToInt32(await command.ExecuteScalarAsync(cancellationToken)) == 1;
    }

    private async Task<ExamPayment?> GetOneAsync(string column, Guid id, CancellationToken cancellationToken)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        var sql = $"SELECT {Columns} FROM dbo.ExamPayments WHERE {column} = @Id;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Id", SqlDbType.UniqueIdentifier) { Value = id });
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? Map(reader) : null;
    }

    private const string QueueSelect = @"
SELECT p.PaymentId, p.ApplicationId, p.UserId, u.FirstName, u.LastName, u.Email, a.CourseAppliedFor, a.Department,
       p.Amount, p.PaymentType, p.ReferenceNumber, p.Status, p.ProofFileName, p.ProofUploadedAt, p.RejectionReason,
       p.InvoiceNumber, v.FirstName AS VerifierFirstName, v.LastName AS VerifierLastName, p.VerifiedAt
FROM dbo.ExamPayments p
JOIN dbo.AdmissionApplications a ON a.ApplicationId = p.ApplicationId
JOIN dbo.Users u ON u.UserId = p.UserId
LEFT JOIN dbo.Users v ON v.UserId = p.VerifiedByUserId";

    private static ExamPayment Map(SqlDataReader reader) => new()
    {
        PaymentId = reader.GetGuid(reader.GetOrdinal("PaymentId")),
        ApplicationId = reader.GetGuid(reader.GetOrdinal("ApplicationId")),
        UserId = reader.GetGuid(reader.GetOrdinal("UserId")),
        PaymentType = reader.GetString(reader.GetOrdinal("PaymentType")),
        Amount = reader.GetDecimal(reader.GetOrdinal("Amount")),
        ReferenceNumber = Text(reader, "ReferenceNumber"),
        ProofFileName = reader.GetString(reader.GetOrdinal("ProofFileName")),
        ProofContentType = reader.GetString(reader.GetOrdinal("ProofContentType")),
        ProofUploadedAt = reader.GetDateTime(reader.GetOrdinal("ProofUploadedAt")),
        Status = reader.GetString(reader.GetOrdinal("Status")),
        RejectionReason = Text(reader, "RejectionReason"),
        InvoiceNumber = Text(reader, "InvoiceNumber"),
        VerifiedAt = reader.IsDBNull(reader.GetOrdinal("VerifiedAt")) ? null : reader.GetDateTime(reader.GetOrdinal("VerifiedAt")),
    };

    private static ExamPaymentQueueItem MapQueueItem(SqlDataReader reader)
    {
        var verifierFirst = Text(reader, "VerifierFirstName");
        var verifierLast = Text(reader, "VerifierLastName");
        return new ExamPaymentQueueItem
        {
            PaymentId = reader.GetGuid(reader.GetOrdinal("PaymentId")),
            ApplicationId = reader.GetGuid(reader.GetOrdinal("ApplicationId")),
            UserId = reader.GetGuid(reader.GetOrdinal("UserId")),
            ApplicantName = $"{reader.GetString(reader.GetOrdinal("FirstName"))} {reader.GetString(reader.GetOrdinal("LastName"))}",
            ApplicantEmail = reader.GetString(reader.GetOrdinal("Email")),
            CourseAppliedFor = reader.GetString(reader.GetOrdinal("CourseAppliedFor")),
            Department = Text(reader, "Department"),
            Amount = reader.GetDecimal(reader.GetOrdinal("Amount")),
            PaymentType = reader.GetString(reader.GetOrdinal("PaymentType")),
            ReferenceNumber = Text(reader, "ReferenceNumber"),
            Status = reader.GetString(reader.GetOrdinal("Status")),
            ProofFileName = reader.GetString(reader.GetOrdinal("ProofFileName")),
            ProofUploadedAt = reader.GetDateTime(reader.GetOrdinal("ProofUploadedAt")),
            RejectionReason = Text(reader, "RejectionReason"),
            InvoiceNumber = Text(reader, "InvoiceNumber"),
            VerifiedByName = verifierFirst is null ? null : $"{verifierFirst} {verifierLast}",
            VerifiedAt = reader.IsDBNull(reader.GetOrdinal("VerifiedAt")) ? null : reader.GetDateTime(reader.GetOrdinal("VerifiedAt")),
        };
    }

    private static string? Text(SqlDataReader reader, string column) =>
        reader.IsDBNull(reader.GetOrdinal(column)) ? null : reader.GetString(reader.GetOrdinal(column));
}
