using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface IExamScheduleRepository
{
    /// <summary>Saturday schedules (always) plus Weekday schedules currently offered, soonest first.</summary>
    Task<IReadOnlyList<ExamSchedule>> GetAvailableAsync(CancellationToken cancellationToken = default);

    Task<ExamScheduleSelection?> GetSelectionByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Records (or replaces) the applicant's confirmed exam schedule. Throws
    /// ExamScheduleNotFoundException if no such schedule exists, or
    /// ExamScheduleNotAvailableException if it's a Weekday slot that isn't
    /// currently offered.
    /// </summary>
    Task<ExamScheduleSelection> SelectAsync(Guid userId, int examScheduleId, CancellationToken cancellationToken = default);
}
