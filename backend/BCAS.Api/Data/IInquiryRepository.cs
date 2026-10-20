using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface IInquiryRepository
{
    /// <summary>Creates a thread with its opening message (always from the applicant) in one transaction. Returns the new ThreadId.</summary>
    Task<Guid> CreateThreadAsync(Guid userId, string subject, string body, CancellationToken cancellationToken = default);

    /// <summary>The applicant's own threads, most recent activity first.</summary>
    Task<IReadOnlyList<InquiryThread>> GetThreadsByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>Every thread across every applicant, most recent activity first, optionally narrowed by Status.</summary>
    Task<IReadOnlyList<InquiryThread>> GetQueueAsync(string? status, CancellationToken cancellationToken = default);

    /// <summary>
    /// One thread by id. When ownerUserId is given, only returns it if it
    /// belongs to that user (null otherwise) - the applicant-facing lookup;
    /// null ownerUserId is the unscoped staff lookup.
    /// </summary>
    Task<InquiryThread?> GetByIdAsync(Guid threadId, Guid? ownerUserId, CancellationToken cancellationToken = default);

    /// <summary>Every message in a thread, oldest first.</summary>
    Task<IReadOnlyList<InquiryMessage>> GetMessagesByThreadIdAsync(Guid threadId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Posts a message and updates the thread's UpdatedAt/unread flags -
    /// the other side's unread flag is set, the poster's own is left alone.
    /// An applicant message (isFromStaff false) also reopens the thread
    /// (Status -> 'Open') unconditionally; a staff message never changes
    /// Status - closing is a deliberate separate action (SetStatusAsync).
    /// </summary>
    Task<InquiryMessage> PostMessageAsync(
        Guid threadId, Guid senderUserId, bool isFromStaff, string body, CancellationToken cancellationToken = default);

    /// <summary>Clears the given side's unread flag. A no-op if it's already clear.</summary>
    Task MarkReadAsync(Guid threadId, bool forStaff, CancellationToken cancellationToken = default);

    /// <summary>Returns the updated thread, or null if no thread has that id.</summary>
    Task<InquiryThread?> SetStatusAsync(Guid threadId, string status, CancellationToken cancellationToken = default);
}
