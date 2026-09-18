using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface ISupportStaffDocumentsService
{
    /// <summary>Read-only stub (BISAASS-51) - see ISupportStaffDocumentsRepository.GetPendingAndFlaggedAsync.</summary>
    Task<IReadOnlyList<AdminDocumentListItemResponse>> GetPendingAndFlaggedAsync(CancellationToken cancellationToken = default);
}
