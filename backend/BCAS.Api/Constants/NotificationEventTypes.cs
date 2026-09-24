namespace BCAS.Api.Constants;

/// <summary>
/// The seven cross-cutting notification event types (BISAASS-59), each
/// with its own applicant-level opt-in/out (BISAASS-24,
/// NotificationPreferences) and, where one already exists, an
/// Admin-level system-wide switch too (NotificationTriggerConfigs,
/// BISAASS-39) - see AdminTriggerKeyByEventType.
/// </summary>
public static class NotificationEventTypes
{
    public const string ApplicationReceived = "ApplicationReceived";
    public const string DocumentFlagged = "DocumentFlagged";
    public const string ExamSchedule = "ExamSchedule";
    public const string ExamPermitAvailable = "ExamPermitAvailable";
    public const string ApplicationResult = "ApplicationResult";
    public const string ScholarshipResult = "ScholarshipResult";
    public const string Announcement = "Announcement";

    /// <summary>Proactive reminder, not tied to a status change - see DeadlineReminderService.</summary>
    public const string ExamReminder = "ExamReminder";

    /// <summary>Proactive reminder, not tied to a status change - see DeadlineReminderService.</summary>
    public const string MissingDocumentReminder = "MissingDocumentReminder";

    /// <summary>Support Staff/Admin replied to the applicant's own inquiry thread - see IStaffInquiryService.</summary>
    public const string InquiryReply = "InquiryReply";

    public static readonly IReadOnlyDictionary<string, string> DisplayNames = new Dictionary<string, string>(StringComparer.Ordinal)
    {
        [ApplicationReceived] = "Application Received",
        [DocumentFlagged] = "Document Flagged or Rejected",
        [ExamSchedule] = "Exam Schedule",
        [ExamPermitAvailable] = "Exam Permit Available",
        [ApplicationResult] = "Application Result",
        [ScholarshipResult] = "Scholarship Result",
        [Announcement] = "Important Announcements",
        [ExamReminder] = "Upcoming Exam Reminder",
        [MissingDocumentReminder] = "Missing Document Reminder",
        [InquiryReply] = "Inquiry Reply",
    };

    public static readonly IReadOnlySet<string> AllowedTypes = new HashSet<string>(DisplayNames.Keys, StringComparer.Ordinal);

    /// <summary>
    /// The NotificationTriggerConfigs.TriggerKey each event type is also
    /// gated by (Admin's own system-wide switch, BISAASS-39), or null for
    /// an event type that switch doesn't cover - those are governed by the
    /// applicant's own preference alone.
    /// </summary>
    public static readonly IReadOnlyDictionary<string, string?> AdminTriggerKeyByEventType = new Dictionary<string, string?>(StringComparer.Ordinal)
    {
        [ApplicationReceived] = null,
        [DocumentFlagged] = "DocumentFlag",
        [ExamSchedule] = null,
        [ExamPermitAvailable] = "PermitRelease",
        [ApplicationResult] = "StatusChange",
        [ScholarshipResult] = "StatusChange",
        [Announcement] = null,
        [ExamReminder] = "ExamReminder",
        [MissingDocumentReminder] = "MissingDocumentReminder",
        [InquiryReply] = "InquiryReply",
    };
}
