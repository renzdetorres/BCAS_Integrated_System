using BCAS.Api.Constants;
using BCAS.Api.Data;

namespace BCAS.Api.Services;

public class NotificationDispatchService : INotificationDispatchService
{
    private readonly IEmailSender _emailSender;
    private readonly INotificationPreferenceRepository _preferenceRepository;
    private readonly INotificationSettingsRepository _adminTriggerRepository;
    private readonly ILogger<NotificationDispatchService> _logger;

    public NotificationDispatchService(
        IEmailSender emailSender,
        INotificationPreferenceRepository preferenceRepository,
        INotificationSettingsRepository adminTriggerRepository,
        ILogger<NotificationDispatchService> logger)
    {
        _emailSender = emailSender;
        _preferenceRepository = preferenceRepository;
        _adminTriggerRepository = adminTriggerRepository;
        _logger = logger;
    }

    public Task NotifyApplicationReceivedAsync(
        Guid userId, string email, string firstName, string category, string programName, CancellationToken cancellationToken = default) =>
        DispatchAsync(
            userId,
            email,
            NotificationEventTypes.ApplicationReceived,
            $"Your {category} Application Has Been Received",
            $"Hi {firstName},\n\n" +
            $"We've received your {category.ToLowerInvariant()} application for {programName}. " +
            "You can track its progress anytime from your applicant portal.\n\n" +
            "Thank you for applying.",
            cancellationToken);

    public Task NotifyDocumentReviewedAsync(
        Guid userId, string email, string firstName, string documentType, string status, string reason, CancellationToken cancellationToken = default) =>
        DispatchAsync(
            userId,
            email,
            NotificationEventTypes.DocumentFlagged,
            status == "Rejected" ? $"Your {documentType} Was Rejected" : $"Your {documentType} Was Flagged",
            $"Hi {firstName},\n\n" +
            $"Your submitted {documentType} document was marked as {status} during verification.\n\n" +
            $"Reason: {reason}\n\n" +
            "Please log in to your applicant portal to re-upload a corrected document.",
            cancellationToken);

    public Task NotifyExamScheduleAsync(
        Guid userId, string email, string firstName, DateOnly examDate, TimeOnly examTime, string venue, CancellationToken cancellationToken = default) =>
        DispatchAsync(
            userId,
            email,
            NotificationEventTypes.ExamSchedule,
            "Your Entrance Exam Schedule Is Confirmed",
            $"Hi {firstName},\n\n" +
            $"Your entrance exam is scheduled for {examDate:MMMM d, yyyy} at {examTime:h:mm tt}, at {venue}.\n\n" +
            "Please arrive at least 30 minutes early.",
            cancellationToken);

    public Task NotifyExamPermitAvailableAsync(Guid userId, string email, string firstName, CancellationToken cancellationToken = default) =>
        DispatchAsync(
            userId,
            email,
            NotificationEventTypes.ExamPermitAvailable,
            "Your Exam Permit Is Now Available",
            $"Hi {firstName},\n\n" +
            "Your entrance exam permit has been released. You can download it anytime from your applicant portal.",
            cancellationToken);

    public Task NotifyApplicationResultAsync(
        Guid userId, string email, string firstName, string decision, string programName, CancellationToken cancellationToken = default) =>
        DispatchAsync(
            userId,
            email,
            NotificationEventTypes.ApplicationResult,
            decision == "Approved" ? "Your Admission Application Has Been Approved" : "Your Admission Application Decision",
            $"Hi {firstName},\n\n" +
            $"A decision has been made on your admission application for {programName}: {decision}.\n\n" +
            "Log in to your applicant portal for the full details.",
            cancellationToken);

    public Task NotifyScholarshipResultAsync(
        Guid userId, string email, string firstName, string decision, string scholarshipName, CancellationToken cancellationToken = default) =>
        DispatchAsync(
            userId,
            email,
            NotificationEventTypes.ScholarshipResult,
            decision == "Approved" ? $"You've Been Approved for {scholarshipName}" : $"Your {scholarshipName} Application Decision",
            $"Hi {firstName},\n\n" +
            $"A decision has been made on your application for {scholarshipName}: {decision}.\n\n" +
            "Log in to your applicant portal for the full details.",
            cancellationToken);

    public async Task NotifyAnnouncementAsync(
        IReadOnlyList<(Guid UserId, string Email, string FirstName)> recipients,
        string title,
        string body,
        CancellationToken cancellationToken = default)
    {
        foreach (var recipient in recipients)
        {
            await DispatchAsync(
                recipient.UserId,
                recipient.Email,
                NotificationEventTypes.Announcement,
                $"Announcement: {title}",
                $"Hi {recipient.FirstName},\n\n{body}",
                cancellationToken);
        }
    }

    /// <summary>
    /// Checks the applicant's own preference and, where this event type has
    /// one, the Admin's system-wide switch, then sends - swallowing (and
    /// logging) any failure so a notification never breaks its triggering
    /// action.
    /// </summary>
    private async Task DispatchAsync(
        Guid userId, string email, string notificationType, string subject, string body, CancellationToken cancellationToken)
    {
        try
        {
            var adminTriggerKey = NotificationEventTypes.AdminTriggerKeyByEventType[notificationType];
            if (adminTriggerKey is not null)
            {
                var triggers = await _adminTriggerRepository.GetAllAsync(cancellationToken);
                var trigger = triggers.FirstOrDefault(t => t.TriggerKey == adminTriggerKey);
                if (trigger is not null && !trigger.IsEnabled)
                {
                    return;
                }
            }

            if (!await _preferenceRepository.IsEnabledAsync(userId, notificationType, cancellationToken))
            {
                return;
            }

            await _emailSender.SendAsync(email, subject, body, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex, "Failed to send {NotificationType} email to {UserId}", notificationType, userId);
        }
    }
}
