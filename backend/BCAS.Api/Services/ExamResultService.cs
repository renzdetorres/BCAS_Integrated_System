using BCAS.Api.Constants;
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

    Task<ExamScoringRulesResponse> GetRulesAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Records the applicant's raw entrance exam score, works out the result from it
    /// (see ExamScoring) and moves the application on: Passed to the interview, Failed to a
    /// closed application, Retake back to choosing a new exam schedule.
    /// </summary>
    Task<ExamResultQueueItem> RecordAsync(Guid applicationId, RecordExamResultRequest request, Guid recordedByUserId, CancellationToken cancellationToken = default);

    Task<MyExamResultResponse> GetMyResultAsync(Guid userId, CancellationToken cancellationToken = default);
}

public class ExamResultService : IExamResultService
{
    private readonly IExamResultRepository _repository;
    private readonly IAdminApplicationsService _applicationsService;
    private readonly IAdmissionApplicationRepository _applicationRepository;
    private readonly IExamScheduleRepository _examScheduleRepository;
    private readonly IUserRepository _userRepository;
    private readonly INotificationDispatchService _notifications;
    private readonly ISchoolConfigService _schoolConfig;
    private readonly ILogger<ExamResultService> _logger;

    public ExamResultService(
        IExamResultRepository repository,
        IAdminApplicationsService applicationsService,
        IAdmissionApplicationRepository applicationRepository,
        IExamScheduleRepository examScheduleRepository,
        IUserRepository userRepository,
        INotificationDispatchService notifications,
        ISchoolConfigService schoolConfig,
        ILogger<ExamResultService> logger)
    {
        _schoolConfig = schoolConfig;
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

    public async Task<ExamScoringRulesResponse> GetRulesAsync(CancellationToken cancellationToken = default)
    {
        var all = await _schoolConfig.GetAllAsync(cancellationToken);
        return new ExamScoringRulesResponse
        {
            TotalItems = int.Parse(all[SchoolConfigKeys.ExamTotalItems]),
            PassingScore = decimal.Parse(all[SchoolConfigKeys.ExamPassingScore]),
            MaxRetakes = int.Parse(all[SchoolConfigKeys.ExamMaxRetakes]),
        };
    }

    public async Task<ExamResultQueueItem> RecordAsync(
        Guid applicationId, RecordExamResultRequest request, Guid recordedByUserId, CancellationToken cancellationToken = default)
    {
        var rules = await GetRulesAsync(cancellationToken);
        var score = request.Score ?? throw new AdmissionStepException("Enter the applicant's raw score.");
        if (score < 0 || score > rules.TotalItems)
        {
            throw new AdmissionStepException($"The raw score must be between 0 and {rules.TotalItems}, the number of items on the exam.");
        }

        var item = await _repository.GetQueueItemAsync(applicationId, cancellationToken)
            ?? throw new ApplicationNotFoundException(applicationId);

        if (item.ApplicationStatus != "ExamDone")
        {
            throw new AdmissionStepException(
                "A result can only be recorded for an applicant who has taken the exam. Mark their exam as done first.");
        }

        var attemptNumber = (await _repository.GetByUserIdAsync(item.UserId, cancellationToken)).Count + 1;
        var result = ExamScoring.Decide(score, attemptNumber, rules);

        var remarks = string.IsNullOrWhiteSpace(request.Remarks) ? null : request.Remarks.Trim();
        var examDate = await _repository.GetBookedExamDateAsync(item.UserId, cancellationToken);
        await _repository.InsertAsync(applicationId, item.UserId, result, score, remarks, examDate, recordedByUserId, cancellationToken);

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
