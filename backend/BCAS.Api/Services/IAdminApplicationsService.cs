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
    /// (BISAASS-56/57). A resulting Approved/Rejected decision also emails
    /// the applicant (Application/Scholarship Result, BISAASS-59), subject
    /// to their own notification preference. Throws
    /// InvalidApplicationCategoryException if
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

    /// <summary>
    /// Admin-only: promotes a Waitlisted scholarship application - atomically
    /// reserves a slot on its scholarship and moves it to Submitted, then
    /// records the change in the status-history audit trail and emails the
    /// applicant. Throws ApplicationNotFoundException if no application with
    /// that id exists or it isn't a Scholarship application,
    /// ScholarshipApplicationNotWaitlistedException if its current status
    /// isn't "Waitlisted", or ScholarshipNotAvailableException if its
    /// scholarship still has no free slot.
    /// </summary>
    Task<AdminApplicationListItemResponse> PromoteFromWaitlistAsync(
        Guid applicationId,
        Guid promotedByUserId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Admin-only: archives every application in the list independently -
    /// one already-archived or not-yet-archivable row fails on its own
    /// without aborting the rest of the batch, same rules as the
    /// single-application ArchiveAsync (each item shares this call's
    /// Reason). For a registrar clearing out a whole filtered page of
    /// completed records at once instead of archiving them one at a time.
    /// </summary>
    Task<BulkOperationResultResponse> BulkArchiveAsync(
        BulkArchiveRequest request,
        Guid archivedByUserId,
        CancellationToken cancellationToken = default);
}
