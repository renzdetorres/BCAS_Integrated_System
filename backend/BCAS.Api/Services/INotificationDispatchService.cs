namespace BCAS.Api.Services;

/// <summary>
/// Sends the email for each of BISAASS-59's seven cross-cutting
/// notification events, respecting the applicant's own opt-out
/// (NotificationPreferences, BISAASS-24) and, where one exists, the
/// Admin's system-wide switch too (NotificationTriggerConfigs,
/// BISAASS-39). A send failure (or an opted-out/disabled event) is only
/// ever logged, never thrown - notifying is a side effect of the
/// triggering action, not something that should fail it.
/// </summary>
public interface INotificationDispatchService
{
    Task NotifyApplicationReceivedAsync(
        Guid userId, string email, string firstName, string category, string programName, CancellationToken cancellationToken = default);

    /// <summary>status is "Flagged" or "Rejected" - the two outcomes this event covers.</summary>
    Task NotifyDocumentReviewedAsync(
        Guid userId, string email, string firstName, string documentType, string status, string reason, CancellationToken cancellationToken = default);

    Task NotifyExamScheduleAsync(
        Guid userId, string email, string firstName, DateOnly examDate, TimeOnly examTime, string venue, CancellationToken cancellationToken = default);

    Task NotifyExamPermitAvailableAsync(Guid userId, string email, string firstName, CancellationToken cancellationToken = default);

    /// <summary>decision is "Approved" or "Rejected".</summary>
    Task NotifyApplicationResultAsync(
        Guid userId, string email, string firstName, string decision, string programName, CancellationToken cancellationToken = default);

    /// <summary>decision is "Approved" or "Rejected".</summary>
    Task NotifyScholarshipResultAsync(
        Guid userId, string email, string firstName, string decision, string scholarshipName, CancellationToken cancellationToken = default);

    /// <summary>
    /// A waitlisted scholarship application was promoted to "Submitted"
    /// because a slot opened up. Gated by the same ScholarshipResult
    /// preference/admin trigger as an actual decision, rather than a new
    /// dedicated event type - thematically the same "something moved on
    /// your scholarship application" notification family.
    /// </summary>
    Task NotifyScholarshipWaitlistPromotedAsync(
        Guid userId, string email, string firstName, string scholarshipName, CancellationToken cancellationToken = default);

    /// <summary>Broadcasts to every given recipient individually, so one failed address never blocks the rest.</summary>
    Task NotifyAnnouncementAsync(
        IReadOnlyList<(Guid UserId, string Email, string FirstName)> recipients,
        string title,
        string body,
        CancellationToken cancellationToken = default);

    /// <summary>A confirmed exam is exactly DeadlineReminderConstants.ExamReminderDaysBefore days away. Sent by DeadlineReminderService, not a triggering action.</summary>
    Task NotifyExamReminderAsync(
        Guid userId, string email, string firstName, DateOnly examDate, TimeOnly examTime, string venue, CancellationToken cancellationToken = default);

    /// <summary>A required document is still missing DeadlineReminderConstants.MissingDocumentReminderMinDaysSinceSubmission+ days after applying. Sent by DeadlineReminderService, not a triggering action.</summary>
    Task NotifyMissingDocumentReminderAsync(
        Guid userId, string email, string firstName, string documentType, CancellationToken cancellationToken = default);

    /// <summary>Support Staff/Admin replied to the applicant's own inquiry thread.</summary>
    Task NotifyInquiryReplyAsync(
        Guid userId, string email, string firstName, string threadSubject, CancellationToken cancellationToken = default);
}
