namespace BCAS.Api.Data;

public interface IDeadlineReminderRepository
{
    /// <summary>Every applicant with a confirmed exam schedule on exactly this date.</summary>
    Task<IReadOnlyList<(Guid UserId, string FirstName, string Email, int ExamScheduleId, DateOnly ExamDate, TimeOnly ExamTime, string Venue)>>
        GetExamsOnDateAsync(DateOnly examDate, CancellationToken cancellationToken = default);

    /// <summary>
    /// Every non-archived, non-Rejected admission application submitted at
    /// or before the cutoff, one row per application (an applicant with
    /// more than one admission application appears once per application,
    /// since each can have a different ApplicationType and therefore a
    /// different requirements checklist). Rejected is excluded since
    /// nagging for documents an application that will never proceed needs
    /// isn't useful.
    /// </summary>
    Task<IReadOnlyList<(Guid UserId, string FirstName, string Email, string ApplicationType)>>
        GetStaleAdmissionApplicantsAsync(DateTime submittedAtOrBeforeUtc, CancellationToken cancellationToken = default);

    /// <summary>The document types (non-archived) a user has already uploaded, regardless of review status.</summary>
    Task<IReadOnlySet<string>> GetUploadedDocumentTypesAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>How many non-archived documents have sat in Status = 'Pending' since at or before the cutoff.</summary>
    Task<int> GetStalePendingDocumentCountAsync(DateTime uploadedAtOrBeforeUtc, CancellationToken cancellationToken = default);

    /// <summary>Every active Support Staff or Admin account, for the document-backlog digest.</summary>
    Task<IReadOnlyList<(Guid UserId, string FirstName, string Email)>> GetStaffRecipientsAsync(CancellationToken cancellationToken = default);

    /// <summary>Which of these candidate SubjectKeys already have a recorded reminder of this type.</summary>
    Task<IReadOnlySet<string>> GetAlreadySentAsync(
        string reminderType, IReadOnlyList<string> candidateSubjectKeys, CancellationToken cancellationToken = default);

    /// <summary>Idempotent - a duplicate (ReminderType, SubjectKey) is silently ignored (a concurrent run of the background check, in practice).</summary>
    Task RecordSentAsync(string reminderType, string subjectKey, CancellationToken cancellationToken = default);
}
