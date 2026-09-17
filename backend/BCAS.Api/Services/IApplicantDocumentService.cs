using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IApplicantDocumentService
{
    /// <summary>
    /// The requirements checklist for the signed-in applicant's most recent
    /// admission application type, each item paired with its upload status.
    /// Throws NoAdmissionApplicationException if no admission application
    /// has been submitted yet.
    /// </summary>
    Task<DocumentChecklistResponse> GetMyChecklistAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Uploads (or re-uploads) a document for the signed-in applicant.
    /// Re-uploading replaces the existing file and resets its status to
    /// Pending. Only PDF files are accepted.
    /// </summary>
    Task<DocumentChecklistItemResponse> UploadDocumentAsync(
        Guid userId,
        string documentType,
        string fileName,
        string contentType,
        byte[] fileBytes,
        CancellationToken cancellationToken = default);
}
