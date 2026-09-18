using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface ISupportStaffDocumentsRepository
{
    /// <summary>
    /// Every non-archived document awaiting review or currently flagged
    /// (Status = Pending or Flagged), most recently uploaded first. A
    /// read-only stub for the BISAASS-51 dashboard's "Document Verification"
    /// quick link - approve/reject/flag actions land with BISAASS-52.
    /// </summary>
    Task<IReadOnlyList<AdminDocumentListItem>> GetPendingAndFlaggedAsync(CancellationToken cancellationToken = default);
}
