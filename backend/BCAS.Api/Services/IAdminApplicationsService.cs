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
    /// remarks, and records the change in the status-history audit trail
    /// (BISAASS-56/57). Throws InvalidApplicationCategoryException if
    /// request.Category isn't Admission/Scholarship,
    /// InvalidApplicationStatusException if request.Status isn't allowed
    /// for that category, InvalidStatusTransitionException if the status
    /// wouldn't move forward through that category's ordered workflow
    /// (Admission: Submitted -> UnderReview -> Approved|Rejected;
    /// Scholarship: Submitted -> DocumentsVerified -> EligibilityScreening
    /// -> Evaluation -> Result -> Approved|Rejected), or
    /// ApplicationNotFoundException if no application with that id exists
    /// in the given category.
    /// </summary>
    Task<AdminApplicationListItemResponse> UpdateStatusAsync(
        Guid applicationId,
        UpdateApplicationStatusRequest request,
        Guid changedByUserId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Admin-only (BISAASS-56): every recorded status change for one
    /// application, oldest first, plus who made each change (null for the
    /// initial submission). Throws ApplicationNotFoundException if no
    /// application with that id exists in the given category.
    /// </summary>
    Task<IReadOnlyList<ApplicationStatusHistoryEntryResponse>> GetStatusHistoryAsync(
        Guid applicationId,
        string category,
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
