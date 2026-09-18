using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IAdminApplicationsService
{
    Task<IReadOnlyList<AdminApplicationListItemResponse>> SearchAsync(
        string? search,
        string? status,
        string? category,
        string? program,
        bool? archived = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Admin-only (BISAASS-31): sets an application's Status, with optional
    /// remarks. Throws InvalidApplicationCategoryException if
    /// request.Category isn't Admission/Scholarship,
    /// InvalidApplicationStatusException if request.Status isn't allowed
    /// for that category, or ApplicationNotFoundException if no
    /// application with that id exists in the given category.
    /// </summary>
    Task<AdminApplicationListItemResponse> UpdateStatusAsync(
        Guid applicationId,
        UpdateApplicationStatusRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Admin-only (BISAASS-35): archives a completed/inactive (Approved or
    /// Rejected) application, with who archived it and an optional reason.
    /// Metadata-only - never deletes the record or its documents. Archiving
    /// an Admission application also archives that applicant's whole
    /// document checklist (BISAASS-19), since it's scoped per-user rather
    /// than per-application. Throws InvalidApplicationCategoryException if
    /// request.Category isn't Admission/Scholarship,
    /// ApplicationNotFoundException if no application with that id exists
    /// in the given category, ApplicationAlreadyArchivedException if it's
    /// already archived, or ApplicationNotArchivableException if its
    /// current status isn't completed/inactive.
    /// </summary>
    Task<AdminApplicationListItemResponse> ArchiveAsync(
        Guid applicationId,
        ArchiveApplicationRequest request,
        Guid archivedByUserId,
        CancellationToken cancellationToken = default);
}
