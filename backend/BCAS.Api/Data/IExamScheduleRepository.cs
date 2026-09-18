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

    /// <summary>Admin-only: creates a new Saturday or Weekday exam schedule.</summary>
    Task<ExamSchedule> CreateAsync(
        string dayType,
        DateOnly examDate,
        TimeOnly examTime,
        string venue,
        bool isOffered,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Admin-only: turns a schedule's IsOffered flag on or off (relevant for
    /// Weekday rows - Saturday rows are always selectable regardless).
    /// Returns the updated schedule, or null if no schedule has that id.
    /// </summary>
    Task<ExamSchedule?> SetOfferedAsync(int examScheduleId, bool isOffered, CancellationToken cancellationToken = default);

    /// <summary>Admin-only: every exam schedule (offered or not), each with the applicants who selected it.</summary>
    Task<IReadOnlyList<AdminExamSchedule>> GetAllWithApplicantsAsync(CancellationToken cancellationToken = default);
}
