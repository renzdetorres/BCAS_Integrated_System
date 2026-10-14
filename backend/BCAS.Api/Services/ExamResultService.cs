using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

/// <summary>A staff action on an admission can't be done in the application's current state.</summary>
public class AdmissionStepException : Exception
{
    public AdmissionStepException(string message)
        : base(message)
    {
    }
}

public interface IExamResultService
{
    Task<IReadOnlyList<ExamResultQueueItem>> GetQueueAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Records the result of the applicant's entrance exam and moves the
    /// application on: Passed to the interview, Failed to a closed application,
    /// Retake back to choosing a new exam schedule.
    /// </summary>
    Task<ExamResultQueueItem> RecordAsync(Guid applicationId, RecordExamResultRequest request, Guid recordedByUserId, CancellationToken cancellationToken = default);

    Task<MyExamResultResponse> GetMyResultAsync(Guid userId, CancellationToken cancellationToken = default);
}

public class ExamResultService : IExamResultService
{
    private static readonly IReadOnlySet<string> Results = new HashSet<string>(StringComparer.Ordinal) { "Passed", "Failed", "Retake" };

    private readonly IExamResultRepository _repository;
    private readonly IAdminApplicationsService _applicationsService;
    private readonly IAdmissionApplicationRepository _applicationRepository;
    private readonly IExamScheduleRepository _examScheduleRepository;
    private readonly IUserRepository _userRepository;
    private readonly INotificationDispatchService _notifications;
    private readonly ILogger<ExamResultService> _logger;

    public ExamResultService(
        IExamResultRepository repository,
        IAdminApplicationsService applicationsService,
        IAdmissionApplicationRepository applicationRepository,
        IExamScheduleRepository examScheduleRepository,
        IUserRepository userRepository,
        INotificationDispatchService notifications,
        ILogger<ExamResultService> logger)
    {
        _repository = repository;
        _applicationsService = applicationsService;
        _applicationRepository = applicationRepository;
        _examScheduleRepository = examScheduleRepository;
        _userRepository = userRepository;
        _notifications = notifications;
        _logger = logger;
    }

    public Task<IReadOnlyList<ExamResultQueueItem>> GetQueueAsync(CancellationToken cancellationToken = default) =>
        _repository.GetQueueAsync(cancellationToken);

    public async Task<ExamResultQueueItem> RecordAsync(
        Guid applicationId, RecordExamResultRequest request, Guid recordedByUserId, CancellationToken cancellationToken = default)
    {
        var result = request.Result?.Trim() ?? string.Empty;
        if (!Results.Contains(result))
        {
            throw new AdmissionStepException("The result must be Passed, Failed or Retake.");
        }

        var item = await _repository.GetQueueItemAsync(applicationId, cancellationToken)
            ?? throw new ApplicationNotFoundException(applicationId);

        if (item.ApplicationStatus != "ExamDone")
        {
            throw new AdmissionStepException(
                "A result can only be recorded for an applicant who has taken the exam. Mark their exam as done first.");
        }

        var remarks = string.IsNullOrWhiteSpace(request.Remarks) ? null : request.Remarks.Trim();
        var examDate = await _repository.GetBookedExamDateAsync(item.UserId, cancellationToken);
        await _repository.InsertAsync(applicationId, item.UserId, result, request.Score, remarks, examDate, recordedByUserId, cancellationToken);

        // Move the application along. The more specific notification below replaces the generic one.
        var nextStatus = result switch
        {
            "Passed" => "Registration",
            "Failed" => "Rejected",
            _ => "DocumentsCleared",
        };
        await _applicationsService.UpdateStatusAsync(
            applicationId,
            new UpdateApplicationStatusRequest
            {
                Category = "Admission",
                Status = nextStatus,
                Remarks = $"Entrance exam result: {result}" + (remarks is null ? string.Empty : $". {remarks}"),
                SuppressNotification = true,
            },
            recordedByUserId,
            cancellationToken);

        // A retake starts over at choosing a slot, so the old booking (and its permit) goes.
        if (result == "Retake")
        {
            await _examScheduleRepository.DeleteSelectionAsync(item.UserId, cancellationToken);
        }

        var applicant = await _userRepository.GetByIdAsync(item.UserId, cancellationToken);
        if (applicant is not null)
        {
            await _notifications.NotifyExamResultAsync(item.UserId, applicant.Email, applicant.FirstName, result, cancellationToken);
        }

        _logger.LogInformation("Exam result {Result} recorded for application {ApplicationId} by {UserId}", result, applicationId, recordedByUserId);
        return (await _repository.GetQueueItemAsync(applicationId, cancellationToken))!;
    }

    public async Task<MyExamResultResponse> GetMyResultAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var application = (await _applicationRepository.GetByUserIdAsync(userId, cancellationToken)).FirstOrDefault()
            ?? throw new NoAdmissionApplicationException();
        var attempts = await _repository.GetByUserIdAsync(userId, cancellationToken);
        var latest = attempts.FirstOrDefault();

        var history = attempts
            .Select(a => new ExamAttemptResponse { Attempt = a.Attempt, Result = a.Result, Score = a.Score, ExamDate = a.ExamDate, RecordedAt = a.RecordedAt })
            .ToList();

        if (latest is null || (application.Status == "ExamDone"))
        {
            return new MyExamResultResponse
            {
                Status = "Waiting",
                NextStep = application.Status == "ExamDone"
                    ? "You took the entrance exam. Your result will be released here and sent to you by email."
                    : "Your result appears here after you take the entrance exam.",
                NextStepPath = application.Status == "ExamDone" ? null : "/exam-schedule",
                History = history,
            };
        }

        var response = new MyExamResultResponse
        {
            Status = latest.Result,
            Score = latest.Score,
            Remarks = latest.Remarks,
            ReleasedAt = latest.RecordedAt,
            Attempt = latest.Attempt,
            History = history,
        };

        switch (latest.Result)
        {
            case "Passed":
                response.NextStep = "You passed the entrance exam. Your interview is next.";
                response.NextStepPath = "/interview";
                break;
            case "Retake":
                response.NextStep = application.Status == "DocumentsCleared"
                    ? "You need to retake the entrance exam. Choose a new exam schedule."
                    : "You need to retake the entrance exam. Your new schedule is shown on your exam permit.";
                response.NextStepPath = application.Status == "DocumentsCleared" ? "/exam-schedule" : "/exam-permit";
                break;
            default:
                response.NextStep = "You did not pass the entrance exam. Contact the admissions office if you'd like to know what other options the school offers.";
                break;
        }

        return response;
    }
}
