using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IAdminDocumentsService
{
    /// <summary>
    /// Admin-only (BISAASS-34): every submitted document system-wide, most
    /// recently uploaded first, optionally narrowed by search (applicant
    /// name/email), status, or documentType.
    /// </summary>
    Task<IReadOnlyList<AdminDocumentListItemResponse>> SearchAsync(
        string? search,
        string? status,
        string? documentType,
        CancellationToken cancellationToken = default);
}
