using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IInterviewService
{
    Task<IReadOnlyList<InterviewQueueItemResponse>> GetQueueAsync(CancellationToken cancellationToken = default);

    /// <summary>Schedules (or reschedules) the interview of an applicant who passed the exam, and tells them.</summary>
    Task<InterviewQueueItemResponse> ScheduleAsync(Guid applicationId, ScheduleInterviewRequest request, Guid scheduledByUserId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Records the interview evaluation, which is the admission result: Passed
    /// moves the applicant on to enrollment, Failed closes the application.
    /// </summary>
    Task<InterviewQueueItemResponse> EvaluateAsync(Guid applicationId, EvaluateInterviewRequest request, Guid evaluatedByUserId, CancellationToken cancellationToken = default);

    Task<MyInterviewResponse> GetMyInterviewAsync(Guid userId, CancellationToken cancellationToken = default);
}

public class InterviewService : IInterviewService
{
    private readonly IInterviewRepository _repository;
    private readonly IAdmissionApplicationRepository _applicationRepository;
    private readonly IAdminApplicationsService _applicationsService;
    private readonly IUserRepository _userRepository;
    private readonly INotificationDispatchService _notifications;
    private readonly ILogger<InterviewService> _logger;

    public InterviewService(
        IInterviewRepository repository,
        IAdmissionApplicationRepository applicationRepository,
        IAdminApplicationsService applicationsService,
        IUserRepository userRepository,
        INotificationDispatchService notifications,
        ILogger<InterviewService> logger)
    {
        _repository = repository;
        _applicationRepository = applicationRepository;
        _applicationsService = applicationsService;
        _userRepository = userRepository;
        _notifications = notifications;
        _logger = logger;
    }

    public async Task<IReadOnlyList<InterviewQueueItemResponse>> GetQueueAsync(CancellationToken cancellationToken = default) =>
        (await _repository.GetQueueAsync(cancellationToken)).Select(ToResponse).ToList();

    public async Task<InterviewQueueItemResponse> ScheduleAsync(
        Guid applicationId, ScheduleInterviewRequest request, Guid scheduledByUserId, CancellationToken cancellationToken = default)
    {
        var item = await _repository.GetQueueItemAsync(applicationId, cancellationToken)
            ?? throw new ApplicationNotFoundException(applicationId);

        if (item.ApplicationStatus != "Registration")
        {
            throw new AdmissionStepException("An interview can only be scheduled for an applicant who passed the entrance exam.");
        }

        var date = request.InterviewDate!.Value;
        if (date < DateOnly.FromDateTime(DateTime.UtcNow.AddHours(8).Date))
        {
            throw new AdmissionStepException("Choose an interview date that hasn't passed.");
        }

        var instructions = string.IsNullOrWhiteSpace(request.Instructions) ? null : request.Instructions.Trim();
        await _repository.UpsertAsync(
            applicationId, item.UserId, date, request.InterviewTime!.Value, request.Location!.Trim(), instructions, scheduledByUserId, cancellationToken);

        var applicant = await _userRepository.GetByIdAsync(item.UserId, cancellationToken);
        if (applicant is not null)
        {
            await _notifications.NotifyInterviewScheduledAsync(
                item.UserId, applicant.Email, applicant.FirstName, date, request.InterviewTime.Value, request.Location.Trim(), instructions, cancellationToken);
        }

        _logger.LogInformation("Interview scheduled for application {ApplicationId} by {UserId}", applicationId, scheduledByUserId);
        return ToResponse((await _repository.GetQueueItemAsync(applicationId, cancellationToken))!);
    }

    public async Task<InterviewQueueItemResponse> EvaluateAsync(
        Guid applicationId, EvaluateInterviewRequest request, Guid evaluatedByUserId, CancellationToken cancellationToken = default)
    {
        var evaluation = request.Evaluation?.Trim() ?? string.Empty;
        if (evaluation is not ("Passed" or "Failed"))
        {
            throw new AdmissionStepException("The interview result must be Passed or Failed.");
        }

        var item = await _repository.GetQueueItemAsync(applicationId, cancellationToken)
            ?? throw new ApplicationNotFoundException(applicationId);

        if (item.ApplicationStatus != "Registration" || item.InterviewDate is null)
        {
            throw new AdmissionStepException("Schedule the interview before recording its result.");
        }

        var notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
        await _repository.EvaluateAsync(applicationId, evaluation, notes, evaluatedByUserId, cancellationToken);

        // The interview result is the admission result.
        await _applicationsService.UpdateStatusAsync(
            applicationId,
            new UpdateApplicationStatusRequest
            {
                Category = "Admission",
                Status = evaluation == "Passed" ? "Approved" : "Rejected",
                Remarks = $"Admission result after interview: {evaluation}" + (notes is null ? string.Empty : $". {notes}"),
                SuppressNotification = evaluation == "Passed",
            },
            evaluatedByUserId,
            cancellationToken);

        if (evaluation == "Passed")
        {
            var applicant = await _userRepository.GetByIdAsync(item.UserId, cancellationToken);
            if (applicant is not null)
            {
                await _notifications.NotifyEnrollmentInstructionAsync(item.UserId, applicant.Email, applicant.FirstName, cancellationToken);
            }
        }

        _logger.LogInformation("Interview for application {ApplicationId} evaluated {Evaluation} by {UserId}", applicationId, evaluation, evaluatedByUserId);
        return ToResponse((await _repository.GetQueueItemAsync(applicationId, cancellationToken))!);
    }

    public async Task<MyInterviewResponse> GetMyInterviewAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var application = (await _applicationRepository.GetByUserIdAsync(userId, cancellationToken)).FirstOrDefault()
            ?? throw new NoAdmissionApplicationException();
        var interview = await _repository.GetByUserIdAsync(userId, cancellationToken);

        if (interview is null)
        {
            return new MyInterviewResponse
            {
                Status = "NotYet",
                Message = application.Status == "Registration"
                    ? "You passed the exam. The school will set your interview schedule and let you know here and by email."
                    : "Your interview schedule appears here once you have passed the entrance exam.",
            };
        }

        var status = interview.Evaluation ?? "Scheduled";
        return new MyInterviewResponse
        {
            Status = status,
            InterviewDate = interview.InterviewDate,
            InterviewTime = interview.InterviewTime,
            Location = interview.Location,
            Instructions = interview.Instructions,
            Message = status switch
            {
                "Passed" => "You passed the admission interview. Proceed to enrollment with the registrar's office.",
                "Failed" => "Your admission application was not accepted. Contact the admissions office if you have questions.",
                _ => "Your interview is scheduled. Arrive early and bring the documents listed below.",
            },
        };
    }

    private static InterviewQueueItemResponse ToResponse(InterviewQueueItem item) => new()
    {
        ApplicationId = item.ApplicationId,
        UserId = item.UserId,
        ApplicantName = item.ApplicantName,
        ApplicantEmail = item.ApplicantEmail,
        Department = item.Department,
        CourseAppliedFor = item.CourseAppliedFor,
        YearLevel = item.YearLevel,
        ApplicationStatus = item.ApplicationStatus,
        Stage = item.Evaluation ?? (item.InterviewDate is null ? "NeedsSchedule" : "Scheduled"),
        InterviewDate = item.InterviewDate,
        InterviewTime = item.InterviewTime,
        Location = item.Location,
        Instructions = item.Instructions,
        EvaluationNotes = item.EvaluationNotes,
        EvaluatedAt = item.EvaluatedAt,
    };
}
