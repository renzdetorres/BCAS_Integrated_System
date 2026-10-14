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

    /// <summary>Requirements (documents) were verified by staff.</summary>
    public const string RequirementsVerified = "RequirementsVerified";

    /// <summary>The entrance exam payment was verified or rejected.</summary>
    public const string PaymentReview = "PaymentReview";

    /// <summary>The entrance exam result (Passed, Failed or Retake) was released.</summary>
    public const string ExamResult = "ExamResult";

    /// <summary>An interview was scheduled.</summary>
    public const string InterviewSchedule = "InterviewSchedule";

    /// <summary>The applicant passed admission and should proceed to enrollment.</summary>
    public const string EnrollmentInstruction = "EnrollmentInstruction";

    /// <summary>Proactive reminder, not tied to a status change - see DeadlineReminderService.</summary>
    public const string ExamReminder = "ExamReminder";

    /// <summary>Proactive reminder, not tied to a status change - see DeadlineReminderService.</summary>
    public const string MissingDocumentReminder = "MissingDocumentReminder";

    /// <summary>Support Staff/Admin replied to the applicant's own inquiry thread - see IStaffInquiryService.</summary>
    public const string InquiryReply = "InquiryReply";

    /// <summary>
    /// A message a staff member wrote to one applicant by hand. It is a direct
    /// message, not an automatic event, so it is always delivered: it has no
    /// applicant preference or Admin switch, and is not listed in DisplayNames.
    /// </summary>
    public const string StaffMessage = "StaffMessage";

    public static readonly IReadOnlyDictionary<string, string> DisplayNames = new Dictionary<string, string>(StringComparer.Ordinal)
    {
        [ApplicationReceived] = "Application Received",
        [DocumentFlagged] = "Document Flagged or Rejected",
        [ExamSchedule] = "Exam Schedule",
        [ExamPermitAvailable] = "Exam Permit Available",
        [ApplicationResult] = "Application Result",
        [ScholarshipResult] = "Scholarship Result",
        [Announcement] = "Important Announcements",
        [RequirementsVerified] = "Requirements Verified",
        [PaymentReview] = "Payment Verified or Rejected",
        [ExamResult] = "Exam Result",
        [InterviewSchedule] = "Interview Schedule",
        [EnrollmentInstruction] = "Enrollment Instructions",
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
        [RequirementsVerified] = null,
        [PaymentReview] = null,
        [ExamResult] = "StatusChange",
        [InterviewSchedule] = null,
        [EnrollmentInstruction] = "StatusChange",
        [ExamReminder] = "ExamReminder",
        [MissingDocumentReminder] = "MissingDocumentReminder",
        [InquiryReply] = "InquiryReply",
        [StaffMessage] = null,
    };
}
