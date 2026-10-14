using BCAS.Api.Constants;
using BCAS.Api.Data;

namespace BCAS.Api.Services;

public class NotificationDispatchService : INotificationDispatchService
{
    private readonly IEmailSender _emailSender;
    private readonly INotificationPreferenceRepository _preferenceRepository;
    private readonly INotificationSettingsRepository _adminTriggerRepository;
    private readonly INotificationInboxRepository _inbox;
    private readonly ILogger<NotificationDispatchService> _logger;

    public NotificationDispatchService(
        IEmailSender emailSender,
        INotificationPreferenceRepository preferenceRepository,
        INotificationSettingsRepository adminTriggerRepository,
        INotificationInboxRepository inbox,
        ILogger<NotificationDispatchService> logger)
    {
        _emailSender = emailSender;
        _preferenceRepository = preferenceRepository;
        _adminTriggerRepository = adminTriggerRepository;
        _inbox = inbox;
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
        Guid userId, string email, string firstName, DateOnly examDate, TimeOnly examTime, string venue, string examType = "Entrance Exam", CancellationToken cancellationToken = default) =>
        DispatchAsync(
            userId,
            email,
            NotificationEventTypes.ExamSchedule,
            $"Your {examType} Schedule Is Confirmed",
            $"Hi {firstName},\n\n" +
            $"Your {examType.ToLowerInvariant()} is scheduled for {examDate:MMMM d, yyyy} at {examTime:h:mm tt}, at {venue}.\n\n" +
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

    public Task NotifyScholarshipWaitlistPromotedAsync(
        Guid userId, string email, string firstName, string scholarshipName, CancellationToken cancellationToken = default) =>
        DispatchAsync(
            userId,
            email,
            NotificationEventTypes.ScholarshipResult,
            $"A Slot Opened Up for {scholarshipName}",
            $"Hi {firstName},\n\n" +
            $"Good news - a slot opened up for {scholarshipName} and your waitlisted application has moved forward. " +
            "It's now in the regular screening workflow.\n\n" +
            "Log in to your applicant portal to track its progress.",
            cancellationToken);

    /// <summary>
    /// Bypasses DispatchAsync's per-recipient checks (they'd be an N+1
    /// query against NotificationPreferences for a large recipient list)
    /// in favor of one batched opted-out lookup, then sends with bounded
    /// parallelism so a large announcement doesn't serialize into one
    /// send-latency per recipient. Announcement has no Admin-level
    /// system-wide switch to check (NotificationEventTypes.
    /// AdminTriggerKeyByEventType[Announcement] is null) - the applicant's
    /// own preference is the only gate.
    /// </summary>
    public async Task NotifyAnnouncementAsync(
        IReadOnlyList<(Guid UserId, string Email, string FirstName)> recipients,
        string title,
        string body,
        CancellationToken cancellationToken = default)
    {
        if (recipients.Count == 0)
        {
            return;
        }

        // The batched opted-out lookup below is itself a query that can
        // fail (a transient DB hiccup) - it must be inside the same
        // try/catch as the sends, not just each individual send, or a
        // failure here would propagate out of this method entirely and
        // fail the admin's SetActiveStatusAsync request even though the
        // announcement was already successfully posted. Every path through
        // this class only ever logs a failure, per the interface contract.
        try
        {
            var optedOut = await _preferenceRepository.GetOptedOutUserIdsAsync(
                recipients.Select(r => r.UserId).ToList(), NotificationEventTypes.Announcement, cancellationToken);

            var subject = $"Announcement: {title}";

            // CancellationToken.None rather than the caller's token: we're
            // still safely inside the admin's HTTP request's async call
            // chain either way (its DI scope, and everything scoped within
            // it like the DB connection factory and SmtpClient, stays
            // alive until this method returns), but a slow broadcast to
            // many recipients shouldn't be cut short mid-flight just
            // because that request's own timeout fired.
            await Parallel.ForEachAsync(
                recipients.Where(r => !optedOut.Contains(r.UserId)),
                new ParallelOptions { MaxDegreeOfParallelism = 10 },
                async (recipient, _) =>
                {
                    try
                    {
                        await _emailSender.SendAsync(recipient.Email, subject, $"Hi {recipient.FirstName},\n\n{body}", CancellationToken.None);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(
                            ex, "Failed to send {NotificationType} email to {UserId}", NotificationEventTypes.Announcement, recipient.UserId);
                    }
                });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to broadcast {NotificationType} email to {RecipientCount} recipients", NotificationEventTypes.Announcement, recipients.Count);
        }
    }

    public Task NotifyExamReminderAsync(
        Guid userId, string email, string firstName, DateOnly examDate, TimeOnly examTime, string venue, CancellationToken cancellationToken = default) =>
        DispatchAsync(
            userId,
            email,
            NotificationEventTypes.ExamReminder,
            "Your Entrance Exam Is Coming Up",
            $"Hi {firstName},\n\n" +
            $"This is a reminder that your entrance exam is coming up on {examDate:MMMM d, yyyy} at {examTime:h:mm tt}, at {venue}.\n\n" +
            "Please arrive at least 30 minutes early and bring your exam permit.",
            cancellationToken);

    public Task NotifyMissingDocumentReminderAsync(
        Guid userId, string email, string firstName, string documentType, CancellationToken cancellationToken = default) =>
        DispatchAsync(
            userId,
            email,
            NotificationEventTypes.MissingDocumentReminder,
            "A Required Document Is Still Missing",
            $"Hi {firstName},\n\n" +
            $"Your application is still missing a required document: {documentType}. " +
            "Please log in to your applicant portal and upload it so we can continue reviewing your application.",
            cancellationToken);

    public Task NotifyScholarshipExamResultAsync(
        Guid userId, string email, string firstName, bool passed, string scholarshipName, CancellationToken cancellationToken = default) =>
        DispatchAsync(
            userId,
            email,
            NotificationEventTypes.ScholarshipResult,
            passed ? $"You Passed the {scholarshipName} Exam" : $"Your {scholarshipName} Exam Result",
            passed
                ? $"Hi {firstName},\n\nYou passed the scholarship exam and are qualified for the interview / essay. The school will contact you about the schedule."
                : $"Hi {firstName},\n\nYou did not pass the scholarship exam. Please proceed with the regular admission process from your applicant portal.",
            cancellationToken);

    public Task NotifyRequirementsVerifiedAsync(Guid userId, string email, string firstName, CancellationToken cancellationToken = default) =>
        DispatchAsync(
            userId,
            email,
            NotificationEventTypes.RequirementsVerified,
            "Your Requirements Have Been Verified",
            $"Hi {firstName},\n\n" +
            "All of your submitted requirements have been verified. Next, pay the entrance exam fee from the Payment page of your applicant portal.",
            cancellationToken);

    public Task NotifyPaymentReviewedAsync(
        Guid userId, string email, string firstName, string status, string? reason, CancellationToken cancellationToken = default) =>
        DispatchAsync(
            userId,
            email,
            NotificationEventTypes.PaymentReview,
            status == "Verified" ? "Your Entrance Exam Payment Was Verified" : "Your Entrance Exam Payment Was Rejected",
            status == "Verified"
                ? $"Hi {firstName},\n\nYour entrance exam payment has been verified. You can now choose your exam schedule from your applicant portal."
                : $"Hi {firstName},\n\nYour entrance exam payment could not be verified.\n\nReason: {reason}\n\nPlease upload a clear, correct proof of payment from the Payment page of your applicant portal.",
            cancellationToken);

    public Task NotifyExamResultAsync(Guid userId, string email, string firstName, string result, CancellationToken cancellationToken = default) =>
        DispatchAsync(
            userId,
            email,
            NotificationEventTypes.ExamResult,
            "Your Entrance Exam Result Is Out",
            $"Hi {firstName},\n\n" +
            result switch
            {
                "Passed" => "Your entrance exam result is Passed. You will receive your interview schedule next.",
                "Retake" => "Your entrance exam result is Retake. A new exam schedule will be arranged for you; check your applicant portal.",
                _ => "Your entrance exam result is Failed. Log in to your applicant portal for details.",
            },
            cancellationToken);

    public Task NotifyInterviewScheduledAsync(
        Guid userId, string email, string firstName, DateOnly date, TimeOnly time, string location, string? instructions, CancellationToken cancellationToken = default) =>
        DispatchAsync(
            userId,
            email,
            NotificationEventTypes.InterviewSchedule,
            "Your Admission Interview Is Scheduled",
            $"Hi {firstName},\n\n" +
            $"Your admission interview is on {date:MMMM d, yyyy} at {time:h:mm tt}, at {location}.\n\n" +
            (string.IsNullOrWhiteSpace(instructions) ? string.Empty : $"{instructions}\n\n") +
            "Please bring the original copies of your submitted documents to the interview.",
            cancellationToken);

    public Task NotifyEnrollmentInstructionAsync(Guid userId, string email, string firstName, CancellationToken cancellationToken = default) =>
        DispatchAsync(
            userId,
            email,
            NotificationEventTypes.EnrollmentInstruction,
            "You Passed Admission: Proceed to Enrollment",
            $"Hi {firstName},\n\n" +
            "Congratulations, you passed the admission process. Please proceed to enrollment with the registrar's office.",
            cancellationToken);

    public Task NotifyInquiryReplyAsync(
        Guid userId, string email, string firstName, string threadSubject, CancellationToken cancellationToken = default) =>
        DispatchAsync(
            userId,
            email,
            NotificationEventTypes.InquiryReply,
            $"New Reply: {threadSubject}",
            $"Hi {firstName},\n\n" +
            $"You have a new reply on your inquiry \"{threadSubject}\".\n\n" +
            "Log in to your applicant portal to read it and respond.",
            cancellationToken);

    public Task NotifyStaffMessageAsync(
        Guid userId, string email, string firstName, string subject, string message, CancellationToken cancellationToken = default) =>
        DispatchAsync(
            userId,
            email,
            NotificationEventTypes.StaffMessage,
            subject,
            $"Hi {firstName},\n\n{message}\n\n- BCAS Admissions",
            cancellationToken);

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

            // A message a staff member wrote by hand is not an automatic event, so no preference can switch it off.
            if (notificationType != NotificationEventTypes.StaffMessage
                && !await _preferenceRepository.IsEnabledAsync(userId, notificationType, cancellationToken))
            {
                return;
            }

            // The system notification is written first and on its own, so an
            // email outage never costs the applicant the in-app copy.
            try
            {
                await _inbox.InsertAsync(userId, notificationType, subject, body, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to store {NotificationType} notification for {UserId}", notificationType, userId);
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
