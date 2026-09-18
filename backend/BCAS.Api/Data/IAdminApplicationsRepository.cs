using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface IAdminApplicationsRepository
{
    /// <summary>
    /// All admission and scholarship applications system-wide, most recent
    /// first, optionally narrowed by any combination of the filters (each
    /// null/empty filter is ignored). search matches the applicant's name
    /// or email; program matches the admission course or scholarship name.
    /// </summary>
    Task<IReadOnlyList<AdminApplicationListItem>> SearchAsync(
        string? search,
        string? status,
        string? category,
        string? program,
        CancellationToken cancellationToken = default);

    /// <summary>A single application (admission or scholarship) by id, or null if none exists.</summary>
    Task<AdminApplicationListItem?> GetByIdAsync(Guid applicationId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Admin-only: sets an application's Status (and optional Remarks).
    /// category must be "Admission" or "Scholarship" - it picks which
    /// underlying table is written. Returns null if no application with
    /// that id exists in the given category.
    /// </summary>
    Task<AdminApplicationListItem?> UpdateStatusAsync(
        Guid applicationId,
        string category,
        string status,
        string? remarks,
        CancellationToken cancellationToken = default);
}
