using BCAS.Api.Models;

namespace BCAS.Api.Services;

/// <summary>The applicant's own side of the two-way inquiry feature - see IStaffInquiryService for Support Staff/Admin's side.</summary>
public interface IApplicantInquiryService
{
    /// <summary>The caller's own threads, most recent activity first.</summary>
    Task<IReadOnlyList<InquiryThreadSummaryResponse>> GetMyThreadsAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// One of the caller's own threads with its full message history;
    /// clears the applicant-side unread flag. Throws
    /// InquiryThreadNotFoundException if no thread with that id exists for
    /// this caller (never distinguished from "belongs to someone else", to
    /// avoid leaking another applicant's thread existence).
    /// </summary>
    Task<InquiryThreadDetailResponse> GetMyThreadDetailAsync(Guid userId, Guid threadId, CancellationToken cancellationToken = default);

    /// <summary>Opens a new thread with its first message.</summary>
    Task<InquiryThreadDetailResponse> CreateThreadAsync(Guid userId, CreateInquiryRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Replies on one of the caller's own threads - reopens it if it was
    /// Closed. Throws InquiryThreadNotFoundException the same way
    /// GetMyThreadDetailAsync does.
    /// </summary>
    Task<InquiryThreadDetailResponse> PostMessageAsync(
        Guid userId, Guid threadId, PostInquiryMessageRequest request, CancellationToken cancellationToken = default);
}
