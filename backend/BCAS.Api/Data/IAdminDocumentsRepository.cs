using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface IAdminDocumentsRepository
{
    /// <summary>
    /// Every submitted document system-wide, most recently uploaded first,
    /// optionally narrowed by any combination of the filters (each
    /// null/empty filter is ignored). search matches the applicant's name
    /// or email; status and documentType match exactly.
    /// </summary>
    Task<IReadOnlyList<AdminDocumentListItem>> SearchAsync(
        string? search,
        string? status,
        string? documentType,
        CancellationToken cancellationToken = default);

    /// <summary>One document's stored file, or null if no such document exists.</summary>
    Task<DocumentFile?> GetFileAsync(Guid documentId, CancellationToken cancellationToken = default);
}
