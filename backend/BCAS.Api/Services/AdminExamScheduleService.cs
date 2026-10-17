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
    private readonly IUserRepository _userRepository;
    private readonly INotificationDispatchService _notificationDispatchService;
    private readonly ILogger<AdminExamScheduleService> _logger;

    public AdminExamScheduleService(
        IExamScheduleRepository examScheduleRepository,
        IAdmissionApplicationRepository admissionApplicationRepository,
        IAdminApplicationsService applicationsService,
        IUserRepository userRepository,
        INotificationDispatchService notificationDispatchService,
        ILogger<AdminExamScheduleService> logger)
    {
        _userRepository = userRepository;
        _notificationDispatchService = notificationDispatchService;
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

    // Every exam schedule is in Philippine time.
    private static readonly TimeZoneInfo Manila = ResolveManila();

    private static TimeZoneInfo ResolveManila()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("Asia/Manila"); }
        catch (TimeZoneNotFoundException) { return TimeZoneInfo.FindSystemTimeZoneById("Singapore Standard Time"); }
    }

    private static DateOnly TodayInManila() => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(DateTime.UtcNow, Manila));

    public async Task<ExamScheduleResponse> CreateAsync(CreateExamScheduleRequest request, CancellationToken cancellationToken = default)
    {
        var examDate = request.ExamDate!.Value;
        var examTime = request.ExamTime!.Value;

        if (examDate < TodayInManila())
        {
            throw new ExamScheduleConflictException("That date has already passed. Choose today or a later date.");
        }

        if (await _examScheduleRepository.SlotExistsAsync(examDate, examTime, null, cancellationToken))
        {
            throw new ExamScheduleConflictException($"That date already has a {examTime:h:mm tt} slot.");
        }

        var schedule = await _examScheduleRepository.CreateAsync(examDate, examTime, request.IsOffered, request.Capacity, cancellationToken);

        _logger.LogInformation(
            "Exam schedule {ExamScheduleId} created: {ExamDate} {ExamTime}",
            schedule.ExamScheduleId,
            schedule.ExamDate,
            schedule.ExamTime);

        return schedule.ToResponse();
    }

    public async Task<ExamScheduleResponse> UpdateAsync(
        int examScheduleId, UpdateExamScheduleRequest request, CancellationToken cancellationToken = default)
    {
        var current = (await _examScheduleRepository.GetAllWithApplicantsAsync(cancellationToken))
            .FirstOrDefault(s => s.ExamScheduleId == examScheduleId)
            ?? throw new ExamScheduleNotFoundException(examScheduleId);
        var newTime = request.ExamTime!.Value;

        if (newTime != current.ExamTime
            && await _examScheduleRepository.SlotExistsAsync(current.ExamDate, newTime, examScheduleId, cancellationToken))
        {
            throw new ExamScheduleConflictException($"That date already has a {newTime:h:mm tt} slot.");
        }

        var schedule = await _examScheduleRepository.UpdateAsync(examScheduleId, newTime, request.Capacity, cancellationToken)
            ?? throw new ExamScheduleNotFoundException(examScheduleId);

        // Applicants already booked on a slot that moved are told the new time.
        if (newTime != current.ExamTime)
        {
            foreach (var applicant in current.AssignedApplicants.Where(a => a.ExamStatus is "Scheduled" or "Rescheduled"))
            {
                var user = await _userRepository.GetByIdAsync(applicant.UserId, cancellationToken);
                if (user is null) continue;
                await _notificationDispatchService.NotifyExamScheduleAsync(
                    applicant.UserId, user.Email, user.FirstName, schedule.ExamDate, schedule.ExamTime, applicant.ExamType, cancellationToken);
            }
        }

        _logger.LogInformation("Exam schedule {ExamScheduleId} updated: {ExamTime}, capacity {Capacity}", examScheduleId, schedule.ExamTime, schedule.Capacity);
        return schedule.ToResponse();
    }

    public async Task DeleteAsync(int examScheduleId, CancellationToken cancellationToken = default)
    {
        if (!await _examScheduleRepository.DeleteAsync(examScheduleId, cancellationToken))
        {
            throw new ExamScheduleNotFoundException(examScheduleId);
        }

        _logger.LogInformation("Exam schedule {ExamScheduleId} deleted", examScheduleId);
    }

    public async Task<int> SetDateOfferedAsync(DateOnly examDate, bool isOffered, CancellationToken cancellationToken = default)
    {
        var count = await _examScheduleRepository.SetOfferedForDateAsync(examDate, isOffered, cancellationToken);
        if (count == 0)
        {
            throw new ExamScheduleConflictException("That date has no time slots yet. Add one first.");
        }

        _logger.LogInformation("Exam date {ExamDate} set to IsOffered={IsOffered} ({Count} slots)", examDate, isOffered, count);
        return count;
    }

    public async Task<ExamScheduleResponse> SetCapacityAsync(
        int examScheduleId,
        int? capacity,
        CancellationToken cancellationToken = default)
    {
        var schedule = await _examScheduleRepository.SetCapacityAsync(examScheduleId, capacity, cancellationToken)
            ?? throw new ExamScheduleNotFoundException(examScheduleId);

        _logger.LogInformation("Exam schedule {ExamScheduleId} capacity set to {Capacity}", examScheduleId, capacity);

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
