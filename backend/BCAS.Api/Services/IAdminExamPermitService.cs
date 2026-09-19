using BCAS.Api.Models;

namespace BCAS.Api.Services;

/// <summary>Admin-Registrar exam permit generation and release (BISAASS-30).</summary>
public interface IAdminExamPermitService
{
    /// <summary>Every applicant with an exam schedule selected, their document-verification status, and permit release status.</summary>
    Task<IReadOnlyList<AdminExamPermitListItemResponse>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Generates and releases the applicant's exam permit - idempotent if
    /// already released (a repeat call never re-emails). The first release
    /// emails the applicant (Exam Permit Available, BISAASS-59), subject to
    /// their own notification preference. Throws
    /// NoExamScheduleSelectedException if the applicant hasn't selected a
    /// schedule, or DocumentsNotVerifiedException if their required
    /// documents aren't all verified yet.
    /// </summary>
    Task<AdminExamPermitListItemResponse> ReleaseAsync(Guid userId, Guid releasedByUserId, CancellationToken cancellationToken = default);
}
