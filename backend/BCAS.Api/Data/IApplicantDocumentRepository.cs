using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface IApplicantDocumentRepository
{
    /// <summary>The user's uploaded documents (metadata only - no file bytes).</summary>
    Task<IReadOnlyList<ApplicantDocument>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates the document if none exists yet for this (user, document type),
    /// otherwise replaces the existing file and resets Status to 'Pending'
    /// for re-verification.
    /// </summary>
    Task<ApplicantDocument> UpsertAsync(
        Guid userId,
        string documentType,
        string fileName,
        string contentType,
        byte[] fileData,
        CancellationToken cancellationToken = default);
}
