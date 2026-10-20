using BCAS.Api.Constants;
using BCAS.Api.Data;

namespace BCAS.Api.Services;

public class DeadlineReminderService : IDeadlineReminderService
{
    private readonly IDeadlineReminderRepository _repository;
    private readonly INotificationDispatchService _notificationDispatchService;
    private readonly INotificationSettingsRepository _notificationSettingsRepository;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<DeadlineReminderService> _logger;

    public DeadlineReminderService(
        IDeadlineReminderRepository repository,
        INotificationDispatchService notificationDispatchService,
        INotificationSettingsRepository notificationSettingsRepository,
        IEmailSender emailSender,
        ILogger<DeadlineReminderService> logger)
    {
        _repository = repository;
        _notificationDispatchService = notificationDispatchService;
        _notificationSettingsRepository = notificationSettingsRepository;
        _emailSender = emailSender;
        _logger = logger;
    }

    public async Task RunAsync(CancellationToken cancellationToken = default)
    {
        await SendExamRemindersAsync(cancellationToken);
        await SendMissingDocumentRemindersAsync(cancellationToken);
        await SendDocumentBacklogDigestAsync(cancellationToken);
    }

    private async Task SendExamRemindersAsync(CancellationToken cancellationToken)
    {
        try
        {
            var targetDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(DeadlineReminderConstants.ExamReminderDaysBefore);
            var exams = await _repository.GetExamsOnDateAsync(targetDate, cancellationToken);
            if (exams.Count == 0)
            {
                return;
            }

            var candidateKeys = exams.Select(BuildExamReminderKey).ToList();
            var alreadySent = await _repository.GetAlreadySentAsync(DeadlineReminderConstants.ExamReminderType, candidateKeys, cancellationToken);

            var sentCount = 0;
            foreach (var exam in exams)
            {
                var key = BuildExamReminderKey(exam);
                if (alreadySent.Contains(key))
                {
                    continue;
                }

                await _notificationDispatchService.NotifyExamReminderAsync(
                    exam.UserId, exam.Email, exam.FirstName, exam.ExamDate, exam.ExamTime, exam.Venue, cancellationToken);
                await _repository.RecordSentAsync(DeadlineReminderConstants.ExamReminderType, key, cancellationToken);
                sentCount++;
            }

            if (sentCount > 0)
            {
                _logger.LogInformation("Exam reminders: {Count} sent for {ExamDate}", sentCount, targetDate);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exam reminder check failed");
        }
    }

    private async Task SendMissingDocumentRemindersAsync(CancellationToken cancellationToken)
    {
        try
        {
            var cutoff = DateTime.UtcNow.AddDays(-DeadlineReminderConstants.MissingDocumentReminderMinDaysSinceSubmission);
            var applicants = await _repository.GetStaleAdmissionApplicantsAsync(cutoff, cancellationToken);
            if (applicants.Count == 0)
            {
                return;
            }

            // Built up front across every applicant (each can be missing more
            // than one required type) before the one batched SentReminders
            // check below, rather than checking one at a time per applicant.
            var missing = new List<(Guid UserId, string FirstName, string Email, string DocumentType)>();
            foreach (var applicant in applicants)
            {
                var uploaded = await _repository.GetUploadedDocumentTypesAsync(applicant.UserId, cancellationToken);
                var required = DocumentConstants.RequiredDocumentsByApplicationType[applicant.ApplicationType];
                missing.AddRange(
                    required.Where(type => !uploaded.Contains(type))
                        .Select(type => (applicant.UserId, applicant.FirstName, applicant.Email, DocumentType: type)));
            }

            if (missing.Count == 0)
            {
                return;
            }

            var candidateKeys = missing.Select(BuildMissingDocumentKey).ToList();
            var alreadySent = await _repository.GetAlreadySentAsync(
                DeadlineReminderConstants.MissingDocumentReminderType, candidateKeys, cancellationToken);

            var sentCount = 0;
            foreach (var item in missing)
            {
                var key = BuildMissingDocumentKey(item);
                if (alreadySent.Contains(key))
                {
                    continue;
                }

                await _notificationDispatchService.NotifyMissingDocumentReminderAsync(
                    item.UserId, item.Email, item.FirstName, item.DocumentType, cancellationToken);
                await _repository.RecordSentAsync(DeadlineReminderConstants.MissingDocumentReminderType, key, cancellationToken);
                sentCount++;
            }

            if (sentCount > 0)
            {
                _logger.LogInformation("Missing-document reminders: {Count} sent", sentCount);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Missing-document reminder check failed");
        }
    }

    private async Task SendDocumentBacklogDigestAsync(CancellationToken cancellationToken)
    {
        try
        {
            var triggers = await _notificationSettingsRepository.GetAllAsync(cancellationToken);
            var trigger = triggers.FirstOrDefault(t => t.TriggerKey == DeadlineReminderConstants.DocumentBacklogDigestTriggerKey);
            if (trigger is not null && !trigger.IsEnabled)
            {
                return;
            }

            var cutoff = DateTime.UtcNow.AddDays(-DeadlineReminderConstants.DocumentBacklogDigestMinDaysPending);
            var staleCount = await _repository.GetStalePendingDocumentCountAsync(cutoff, cancellationToken);
            if (staleCount == 0)
            {
                return;
            }

            // At most once per calendar day while the backlog persists - the
            // SubjectKey is today's date rather than a per-document key, so
            // this one intentionally re-fires daily instead of send-once
            // forever (see the SentReminders schema comment).
            var todayKey = DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd");
            var alreadySentToday = await _repository.GetAlreadySentAsync(
                DeadlineReminderConstants.DocumentBacklogDigestType, new[] { todayKey }, cancellationToken);
            if (alreadySentToday.Contains(todayKey))
            {
                return;
            }

            var recipients = await _repository.GetStaffRecipientsAsync(cancellationToken);
            const string subject = "Document Verification Backlog";
            var body =
                $"{staleCount} document{(staleCount == 1 ? "" : "s")} " +
                $"{(staleCount == 1 ? "has" : "have")} been awaiting review for " +
                $"{DeadlineReminderConstants.DocumentBacklogDigestMinDaysPending}+ days. Check the Document Verification queue.";

            foreach (var staff in recipients)
            {
                try
                {
                    await _emailSender.SendAsync(staff.Email, subject, $"Hi {staff.FirstName},\n\n{body}", cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send document-backlog digest to {UserId}", staff.UserId);
                }
            }

            await _repository.RecordSentAsync(DeadlineReminderConstants.DocumentBacklogDigestType, todayKey, cancellationToken);
            _logger.LogInformation(
                "Document backlog digest sent to {RecipientCount} staff accounts ({StaleCount} stale documents)",
                recipients.Count,
                staleCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Document backlog digest check failed");
        }
    }

    private static string BuildExamReminderKey(
        (Guid UserId, string FirstName, string Email, int ExamScheduleId, DateOnly ExamDate, TimeOnly ExamTime, string Venue) exam) =>
        $"{exam.UserId}:{exam.ExamScheduleId}";

    private static string BuildMissingDocumentKey((Guid UserId, string FirstName, string Email, string DocumentType) item) =>
        $"{item.UserId}:{item.DocumentType}";
}
