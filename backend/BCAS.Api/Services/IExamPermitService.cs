using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IExamPermitService
{
    /// <summary>
    /// The signed-in applicant's exam permit. Throws
    /// NoExamScheduleSelectedException if they haven't selected a schedule yet.
    /// </summary>
    Task<ExamPermitResponse> GetMyPermitAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<ExamRescheduleRequestResponse?> GetMyRescheduleRequestAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Submits a reschedule request. Throws NoExamScheduleSelectedException
    /// if the applicant has no permit yet, or
    /// RescheduleRequestAlreadyPendingException if one is already awaiting
    /// a decision.
    /// </summary>
    Task<ExamRescheduleRequestResponse> SubmitRescheduleRequestAsync(
        Guid userId,
        SubmitExamRescheduleRequest request,
        CancellationToken cancellationToken = default);
}
