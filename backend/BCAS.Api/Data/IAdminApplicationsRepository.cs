using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface IAdminApplicationsRepository
{
    /// <summary>
    /// All admission and scholarship applications system-wide, most recent
    /// first, optionally narrowed by any combination of the filters (each
    /// null/empty filter is ignored). search matches the applicant's name
    /// or email; program matches the admission course or scholarship name;
    /// archived (BISAASS-35), when set, narrows to only archived (true) or
    /// only non-archived (false) applications - null (the default,
    /// unchanged since BISAASS-28) applies no archive filtering at all.
    /// </summary>
    Task<IReadOnlyList<AdminApplicationListItem>> SearchAsync(
        string? search,
        string? status,
        string? category,
        string? program,
        bool? archived = null,
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

    /// <summary>
    /// Admin-only (BISAASS-35): flags an application as archived, with who
    /// archived it, when, and an optional reason - a metadata-only change,
    /// never a delete. category must be "Admission" or "Scholarship" - it
    /// picks which underlying table is written. Returns null if no
    /// application with that id exists in the given category.
    /// </summary>
    Task<AdminApplicationListItem?> ArchiveAsync(
        Guid applicationId,
        string category,
        string? reason,
        Guid archivedByUserId,
        CancellationToken cancellationToken = default);
}
