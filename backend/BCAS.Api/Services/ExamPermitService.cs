using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class ExamPermitService : IExamPermitService
{
    private readonly IExamScheduleRepository _examScheduleRepository;
    private readonly IExamRescheduleRequestRepository _rescheduleRequestRepository;

    public ExamPermitService(
        IExamScheduleRepository examScheduleRepository,
        IExamRescheduleRequestRepository rescheduleRequestRepository)
    {
        _examScheduleRepository = examScheduleRepository;
        _rescheduleRequestRepository = rescheduleRequestRepository;
    }

    public async Task<ExamPermitResponse> GetMyPermitAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var selection = await _examScheduleRepository.GetSelectionByUserIdAsync(userId, cancellationToken)
            ?? throw new NoExamScheduleSelectedException();

        return selection.ToPermitResponse();
    }

    public async Task<ExamRescheduleRequestResponse?> GetMyRescheduleRequestAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var request = await _rescheduleRequestRepository.GetLatestByUserIdAsync(userId, cancellationToken);
        return request?.ToResponse();
    }

    public async Task<ExamRescheduleRequestResponse> SubmitRescheduleRequestAsync(
        Guid userId,
        SubmitExamRescheduleRequest request,
        CancellationToken cancellationToken = default)
    {
        if (await _examScheduleRepository.GetSelectionByUserIdAsync(userId, cancellationToken) is null)
        {
            throw new NoExamScheduleSelectedException();
        }

        var created = await _rescheduleRequestRepository.CreateAsync(userId, request.Reason!, cancellationToken);
        return created.ToResponse();
    }
}
