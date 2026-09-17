using BCAS.Api.Data;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class ExamScheduleService : IExamScheduleService
{
    private readonly IExamScheduleRepository _examScheduleRepository;

    public ExamScheduleService(IExamScheduleRepository examScheduleRepository)
    {
        _examScheduleRepository = examScheduleRepository;
    }

    public async Task<IReadOnlyList<ExamScheduleResponse>> GetAvailableAsync(CancellationToken cancellationToken = default)
    {
        var schedules = await _examScheduleRepository.GetAvailableAsync(cancellationToken);
        return schedules.Select(s => s.ToResponse()).ToList();
    }

    public async Task<ExamScheduleSelectionResponse?> GetMySelectionAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var selection = await _examScheduleRepository.GetSelectionByUserIdAsync(userId, cancellationToken);
        return selection?.ToResponse();
    }

    public async Task<ExamScheduleSelectionResponse> SelectAsync(
        Guid userId,
        SelectExamScheduleRequest request,
        CancellationToken cancellationToken = default)
    {
        var selection = await _examScheduleRepository.SelectAsync(userId, request.ExamScheduleId!.Value, cancellationToken);
        return selection.ToResponse();
    }
}
