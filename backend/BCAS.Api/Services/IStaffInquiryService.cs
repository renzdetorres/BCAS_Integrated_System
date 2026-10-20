using BCAS.Api.Models;

namespace BCAS.Api.Services;

/// <summary>Support Staff/Admin's side of the two-way inquiry feature - see IApplicantInquiryService for the applicant's side.</summary>
public interface IStaffInquiryService
{
    /// <summary>Every thread across every applicant, most recent activity first, optionally narrowed by Status ('Open' or 'Closed').</summary>
    Task<IReadOnlyList<InquiryThreadSummaryResponse>> GetQueueAsync(string? status, CancellationToken cancellationToken = default);

    /// <summary>One thread's full message history; clears the staff-side unread flag. Throws InquiryThreadNotFoundException if no thread with that id exists.</summary>
    Task<InquiryThreadDetailResponse> GetThreadDetailAsync(Guid threadId, CancellationToken cancellationToken = default);

    /// <summary>Replies on a thread and emails the applicant (subject to their own InquiryReply preference). Never changes Status - see IInquiryRepository.PostMessageAsync.</summary>
    Task<InquiryThreadDetailResponse> PostMessageAsync(
        Guid staffUserId, Guid threadId, PostInquiryMessageRequest request, CancellationToken cancellationToken = default);

    /// <summary>Marks a thread resolved. Throws InquiryThreadNotFoundException if no thread with that id exists.</summary>
    Task<InquiryThreadSummaryResponse> CloseAsync(Guid threadId, CancellationToken cancellationToken = default);

    /// <summary>Reopens a closed thread. Throws InquiryThreadNotFoundException if no thread with that id exists.</summary>
    Task<InquiryThreadSummaryResponse> ReopenAsync(Guid threadId, CancellationToken cancellationToken = default);
}
