using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IAdminExamScheduleService
{
    /// <summary>Every exam schedule with its assigned applicants, soonest exam date first.</summary>
    Task<IReadOnlyList<AdminExamScheduleResponse>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>Throws InvalidDayTypeException for an unrecognized DayType.</summary>
    Task<ExamScheduleResponse> CreateAsync(CreateExamScheduleRequest request, CancellationToken cancellationToken = default);

    /// <summary>Throws ExamScheduleNotFoundException if no schedule has that id.</summary>
    Task<ExamScheduleResponse> SetOfferedAsync(
        int examScheduleId,
        bool isOffered,
        CancellationToken cancellationToken = default);
}
