using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IAdminExamScheduleService
{
    /// <summary>Every exam schedule with its assigned applicants, soonest exam date first.</summary>
    Task<IReadOnlyList<AdminExamScheduleResponse>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>Adds a time slot to a date. Throws ExamScheduleConflictException for a past date or a time the date already has.</summary>
    Task<ExamScheduleResponse> CreateAsync(CreateExamScheduleRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Changes a slot's time and seats. Throws ExamScheduleNotFoundException, or
    /// ExamScheduleConflictException when the time is taken or the seats are fewer than
    /// the applicants already booked. Applicants booked on a moved slot are told the new time.
    /// </summary>
    Task<ExamScheduleResponse> UpdateAsync(int examScheduleId, UpdateExamScheduleRequest request, CancellationToken cancellationToken = default);

    /// <summary>Removes a slot nobody has booked. Throws ExamScheduleNotFoundException, or ExamScheduleConflictException when it has bookings.</summary>
    Task DeleteAsync(int examScheduleId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Records what happened to a scheduled applicant after their exam slot
    /// (Scheduled, ExamDone, Rescheduled, DidNotTakeExam) and moves their
    /// admission application along with it where the workflow allows
    /// (ExamDone, DidNotTakeExam, and back to ExamScheduled). Throws
    /// InvalidExamStatusException or NoExamScheduleSelectedException.
    /// </summary>
    Task SetApplicantExamStatusAsync(Guid userId, string status, Guid changedByUserId, CancellationToken cancellationToken = default);

    /// <summary>Sets how many applicants a slot holds (null = no limit). Throws ExamScheduleNotFoundException if there is no such schedule.</summary>
    Task<ExamScheduleResponse> SetCapacityAsync(int examScheduleId, int? capacity, CancellationToken cancellationToken = default);

    /// <summary>Offers or withdraws one slot. Throws ExamScheduleNotFoundException if there is no such schedule.</summary>
    Task<ExamScheduleResponse> SetOfferedAsync(
        int examScheduleId,
        bool isOffered,
        CancellationToken cancellationToken = default);

    /// <summary>Offers or withdraws every slot on a date. Returns how many slots changed; throws ExamScheduleNotFoundException when the date has none.</summary>
    Task<int> SetDateOfferedAsync(DateOnly examDate, bool isOffered, CancellationToken cancellationToken = default);
}
