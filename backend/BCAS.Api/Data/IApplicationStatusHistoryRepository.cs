using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface IApplicationStatusHistoryRepository
{
    /// <summary>
    /// Records one status change (or the initial submission, with
    /// fromStatus and changedByUserId both null) for an admission or
    /// scholarship application. category must be "Admission" or
    /// "Scholarship".
    /// </summary>
    Task InsertAsync(
        Guid applicationId,
        string category,
        string? fromStatus,
        string toStatus,
        string? remarks,
        Guid? changedByUserId,
        CancellationToken cancellationToken = default);

    /// <summary>Every recorded change for one application, oldest first.</summary>
    Task<IReadOnlyList<ApplicationStatusHistoryEntry>> GetByApplicationIdAsync(
        Guid applicationId,
        string category,
        CancellationToken cancellationToken = default);
}
