using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface IExamRescheduleRequestRepository
{
    /// <summary>The applicant's most recently submitted reschedule request, or null if they've never submitted one.</summary>
    Task<ExamRescheduleRequest?> GetLatestByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Records a new reschedule request. Throws
    /// RescheduleRequestAlreadyPendingException if the applicant already
    /// has one awaiting a decision.
    /// </summary>
    Task<ExamRescheduleRequest> CreateAsync(Guid userId, string reason, CancellationToken cancellationToken = default);
}
