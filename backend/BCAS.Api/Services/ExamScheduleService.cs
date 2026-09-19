using BCAS.Api.Data;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class ExamScheduleService : IExamScheduleService
{
    private readonly IExamScheduleRepository _examScheduleRepository;
    private readonly IUserRepository _userRepository;
    private readonly INotificationDispatchService _notificationDispatchService;

    public ExamScheduleService(
        IExamScheduleRepository examScheduleRepository,
        IUserRepository userRepository,
        INotificationDispatchService notificationDispatchService)
    {
        _examScheduleRepository = examScheduleRepository;
        _userRepository = userRepository;
        _notificationDispatchService = notificationDispatchService;
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

        // Exam Schedule notification (BISAASS-59).
        var applicant = await _userRepository.GetByIdAsync(userId, cancellationToken);
        if (applicant is not null)
        {
            await _notificationDispatchService.NotifyExamScheduleAsync(
                userId, applicant.Email, applicant.FirstName, selection.ExamDate, selection.ExamTime, selection.Venue, cancellationToken);
        }

        return selection.ToResponse();
    }
}
