using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class AdminExamScheduleService : IAdminExamScheduleService
{
    private readonly IExamScheduleRepository _examScheduleRepository;
    private readonly IAdmissionApplicationRepository _admissionApplicationRepository;
    private readonly IAdminApplicationsService _applicationsService;
    private readonly ILogger<AdminExamScheduleService> _logger;

    public AdminExamScheduleService(
        IExamScheduleRepository examScheduleRepository,
        IAdmissionApplicationRepository admissionApplicationRepository,
        IAdminApplicationsService applicationsService,
        ILogger<AdminExamScheduleService> logger)
    {
        _examScheduleRepository = examScheduleRepository;
        _admissionApplicationRepository = admissionApplicationRepository;
        _applicationsService = applicationsService;
        _logger = logger;
    }

    public async Task SetApplicantExamStatusAsync(
        Guid userId, string status, Guid changedByUserId, CancellationToken cancellationToken = default)
    {
        if (!ExamScheduleConstants.AllowedExamStatuses.Contains(status))
        {
            throw new InvalidExamStatusException(status);
        }

        if (!await _examScheduleRepository.SetExamStatusAsync(userId, status, cancellationToken))
        {
            throw new NoExamScheduleSelectedException();
        }

        // Keep the admission application in step with what happened at the exam.
        // Only a move the workflow actually allows is made; anything else
        // (an application that is not at the exam step) is left alone.
        var application = (await _admissionApplicationRepository.GetByUserIdAsync(userId, cancellationToken)).FirstOrDefault();
        var target = status switch
        {
            "ExamDone" => "ExamDone",
            "DidNotTakeExam" => AdmissionWorkflowConstants.DidNotTakeExam,
            "Scheduled" or "Rescheduled" => "ExamScheduled",
            _ => null,
        };

        if (application is not null && target is not null && AdmissionWorkflowConstants.IsAllowedTransition(application.Status, target))
        {
            await _applicationsService.UpdateStatusAsync(
                application.ApplicationId,
                new UpdateApplicationStatusRequest { Category = "Admission", Status = target, Remarks = "Set from the exam status" },
                changedByUserId,
                cancellationToken);
        }
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
