using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IExamScheduleService
{
    Task<IReadOnlyList<ExamScheduleResponse>> GetAvailableAsync(CancellationToken cancellationToken = default);

    Task<ExamScheduleSelectionResponse?> GetMySelectionAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>Records the applicant's chosen exam schedule and emails them a confirmation (Exam Schedule, BISAASS-59), subject to their own notification preference.</summary>
    Task<ExamScheduleSelectionResponse> SelectAsync(
        Guid userId,
        SelectExamScheduleRequest request,
        CancellationToken cancellationToken = default);
}
