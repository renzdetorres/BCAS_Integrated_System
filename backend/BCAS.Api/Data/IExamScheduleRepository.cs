using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface IExamScheduleRepository
{
    /// <summary>Offered slots that have not started yet (Philippine time), soonest first.</summary>
    Task<IReadOnlyList<ExamSchedule>> GetAvailableAsync(CancellationToken cancellationToken = default);

    Task<ExamScheduleSelection?> GetSelectionByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Records (or replaces) the applicant's confirmed exam schedule. Throws
    /// ExamScheduleNotFoundException if no such schedule exists, or
    /// ExamScheduleNotAvailableException if the slot is not offered, has already
    /// started, or is full.
    /// </summary>
    Task<ExamScheduleSelection> SelectAsync(Guid userId, int examScheduleId, string examType, CancellationToken cancellationToken = default);

    /// <summary>Admin-only: adds a time slot on a date (the day type follows the date).</summary>
    Task<ExamSchedule> CreateAsync(
        DateOnly examDate,
        TimeOnly examTime,
        bool isOffered,
        int? capacity,
        CancellationToken cancellationToken = default);

    /// <summary>Admin-only: whether the date already has a slot at this time (ignoring one slot, when editing it).</summary>
    Task<bool> SlotExistsAsync(DateOnly examDate, TimeOnly examTime, int? exceptExamScheduleId, CancellationToken cancellationToken = default);

    /// <summary>Admin-only: offers or withdraws every slot on a date. Returns how many slots there are on it.</summary>
    Task<int> SetOfferedForDateAsync(DateOnly examDate, bool isOffered, CancellationToken cancellationToken = default);

    /// <summary>
    /// Admin-only: changes a slot's time and seats. Null if there is no such slot; throws
    /// ExamScheduleConflictException if the seats would be fewer than the applicants already booked.
    /// </summary>
    Task<ExamSchedule?> UpdateAsync(int examScheduleId, TimeOnly examTime, int? capacity, CancellationToken cancellationToken = default);

    /// <summary>Admin-only: removes a slot. False if there is none; throws ExamScheduleConflictException if applicants booked it.</summary>
    Task<bool> DeleteAsync(int examScheduleId, CancellationToken cancellationToken = default);

    /// <summary>Admin-only: offers or withdraws one slot. Null if no schedule has that id.</summary>
    Task<ExamSchedule?> SetOfferedAsync(int examScheduleId, bool isOffered, CancellationToken cancellationToken = default);

    /// <summary>Admin-only: sets how many seats a slot has (null = no limit). Null result if the schedule does not exist.</summary>
    Task<ExamSchedule?> SetCapacityAsync(int examScheduleId, int? capacity, CancellationToken cancellationToken = default);

    /// <summary>Removes the applicant's exam schedule selection (used when a retake sends them back to choose a new slot). False if they had none.</summary>
    Task<bool> DeleteSelectionAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>Admin-only: every exam schedule (offered or not), each with the applicants who selected it.</summary>
    Task<IReadOnlyList<AdminExamSchedule>> GetAllWithApplicantsAsync(CancellationToken cancellationToken = default);

    /// <summary>Admin-only: records what happened to a scheduled applicant (ExamStatus). False if they have no selection.</summary>
    Task<bool> SetExamStatusAsync(Guid userId, string examStatus, CancellationToken cancellationToken = default);

    /// <summary>Admin-only: every applicant who has selected an exam schedule, with permit release status.</summary>
    Task<IReadOnlyList<AdminExamPermitCandidate>> GetAllSelectionsWithApplicantsAsync(CancellationToken cancellationToken = default);

    /// <summary>Admin-only: a single applicant's exam schedule selection with permit release status, or null if none.</summary>
    Task<AdminExamPermitCandidate?> GetPermitCandidateByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Admin-only: marks the applicant's permit released (idempotent - a
    /// no-op if already released). Returns null if the applicant has no
    /// exam schedule selected.
    /// </summary>
    Task<AdminExamPermitCandidate?> ReleasePermitAsync(Guid userId, Guid releasedByUserId, decimal examFee, string? invoiceNumber, CancellationToken cancellationToken = default);
}
