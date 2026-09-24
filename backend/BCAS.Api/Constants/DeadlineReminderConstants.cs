namespace BCAS.Api.Constants;

public static class DeadlineReminderConstants
{
    public const int ExamReminderDaysBefore = 3;
    public const int MissingDocumentReminderMinDaysSinceSubmission = 5;
    public const int DocumentBacklogDigestMinDaysPending = 5;

    public const string ExamReminderType = "ExamReminder";
    public const string MissingDocumentReminderType = "MissingDocumentReminder";
    public const string DocumentBacklogDigestType = "DocumentBacklogDigest";

    /// <summary>Matches NotificationTriggerConfigs.TriggerKey seeded for the staff-only digest (not an applicant NotificationEventTypes entry - see DeadlineReminderService).</summary>
    public const string DocumentBacklogDigestTriggerKey = "DocumentBacklogDigest";
}
