using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IExamScheduleService
{
    Task<IReadOnlyList<ExamScheduleResponse>> GetAvailableAsync(CancellationToken cancellationToken = default);

    Task<ExamScheduleSelectionResponse?> GetMySelectionAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<ExamScheduleSelectionResponse> SelectAsync(
        Guid userId,
        SelectExamScheduleRequest request,
        CancellationToken cancellationToken = default);
}
