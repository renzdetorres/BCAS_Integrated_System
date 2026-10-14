using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IAdminExamScheduleService
{
    /// <summary>Every exam schedule with its assigned applicants, soonest exam date first.</summary>
    Task<IReadOnlyList<AdminExamScheduleResponse>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>Throws InvalidDayTypeException for an unrecognized DayType.</summary>
    Task<ExamScheduleResponse> CreateAsync(CreateExamScheduleRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Records what happened to a scheduled applicant after their exam slot
    /// (Scheduled, ExamDone, Rescheduled, DidNotTakeExam) and moves their
    /// admission application along with it where the workflow allows
    /// (ExamDone, DidNotTakeExam, and back to ExamScheduled). Throws
    /// InvalidExamStatusException or NoExamScheduleSelectedException.
    /// </summary>
    Task SetApplicantExamStatusAsync(Guid userId, string status, Guid changedByUserId, CancellationToken cancellationToken = default);

    /// <summary>Throws ExamScheduleNotFoundException if no schedule has that id.</summary>
    /// <summary>Sets how many applicants a slot holds (null = no limit). Throws ExamScheduleNotFoundException if there is no such schedule.</summary>
    Task<ExamScheduleResponse> SetCapacityAsync(int examScheduleId, int? capacity, CancellationToken cancellationToken = default);

    Task<ExamScheduleResponse> SetOfferedAsync(
        int examScheduleId,
        bool isOffered,
        CancellationToken cancellationToken = default);
}
