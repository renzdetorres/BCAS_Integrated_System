using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class AdminExamScheduleService : IAdminExamScheduleService
{
    private readonly IExamScheduleRepository _examScheduleRepository;
    private readonly ILogger<AdminExamScheduleService> _logger;

    public AdminExamScheduleService(IExamScheduleRepository examScheduleRepository, ILogger<AdminExamScheduleService> logger)
    {
        _examScheduleRepository = examScheduleRepository;
        _logger = logger;
    }

    public async Task<IReadOnlyList<AdminExamScheduleResponse>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var schedules = await _examScheduleRepository.GetAllWithApplicantsAsync(cancellationToken);
        return schedules.Select(s => s.ToAdminResponse()).ToList();
    }

    public async Task<ExamScheduleResponse> CreateAsync(CreateExamScheduleRequest request, CancellationToken cancellationToken = default)
    {
        if (!ExamScheduleConstants.AllowedDayTypes.Contains(request.DayType))
        {
            throw new InvalidDayTypeException(request.DayType);
        }

        var schedule = await _examScheduleRepository.CreateAsync(
            request.DayType,
            request.ExamDate!.Value,
            request.ExamTime!.Value,
            request.Venue.Trim(),
            request.IsOffered,
            cancellationToken);

        _logger.LogInformation(
            "Exam schedule {ExamScheduleId} created: {DayType} {ExamDate} {ExamTime}",
            schedule.ExamScheduleId,
            schedule.DayType,
            schedule.ExamDate,
            schedule.ExamTime);

        return schedule.ToResponse();
    }

    public async Task<ExamScheduleResponse> SetOfferedAsync(
        int examScheduleId,
        bool isOffered,
        CancellationToken cancellationToken = default)
    {
        var schedule = await _examScheduleRepository.SetOfferedAsync(examScheduleId, isOffered, cancellationToken)
            ?? throw new ExamScheduleNotFoundException(examScheduleId);

        _logger.LogInformation("Exam schedule {ExamScheduleId} set to IsOffered={IsOffered}", examScheduleId, isOffered);

        return schedule.ToResponse();
    }
}
