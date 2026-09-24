using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class StaffInquiryService : IStaffInquiryService
{
    private readonly IInquiryRepository _inquiryRepository;
    private readonly INotificationDispatchService _notificationDispatchService;

    public StaffInquiryService(IInquiryRepository inquiryRepository, INotificationDispatchService notificationDispatchService)
    {
        _inquiryRepository = inquiryRepository;
        _notificationDispatchService = notificationDispatchService;
    }

    public async Task<IReadOnlyList<InquiryThreadSummaryResponse>> GetQueueAsync(
        string? status, CancellationToken cancellationToken = default)
    {
        var threads = await _inquiryRepository.GetQueueAsync(status, cancellationToken);
        return threads.Select(t => t.ToSummaryResponse(t.HasUnreadForStaff)).ToList();
    }

    public async Task<InquiryThreadDetailResponse> GetThreadDetailAsync(Guid threadId, CancellationToken cancellationToken = default)
    {
        var thread = await _inquiryRepository.GetByIdAsync(threadId, null, cancellationToken)
            ?? throw new InquiryThreadNotFoundException(threadId);

        await _inquiryRepository.MarkReadAsync(threadId, forStaff: true, cancellationToken);

        var messages = await _inquiryRepository.GetMessagesByThreadIdAsync(threadId, cancellationToken);
        return thread.ToDetailResponse(messages);
    }

    public async Task<InquiryThreadDetailResponse> PostMessageAsync(
        Guid staffUserId, Guid threadId, PostInquiryMessageRequest request, CancellationToken cancellationToken = default)
    {
        var existing = await _inquiryRepository.GetByIdAsync(threadId, null, cancellationToken)
            ?? throw new InquiryThreadNotFoundException(threadId);

        await _inquiryRepository.PostMessageAsync(threadId, staffUserId, isFromStaff: true, request.Body.Trim(), cancellationToken);

        var applicantFirstName = existing.ApplicantName.Split(' ', 2)[0];
        await _notificationDispatchService.NotifyInquiryReplyAsync(
            existing.UserId, existing.ApplicantEmail, applicantFirstName, existing.Subject, cancellationToken);

        var thread = await _inquiryRepository.GetByIdAsync(threadId, null, cancellationToken)
            ?? throw new InquiryThreadNotFoundException(threadId);
        var messages = await _inquiryRepository.GetMessagesByThreadIdAsync(threadId, cancellationToken);
        return thread.ToDetailResponse(messages);
    }

    public async Task<InquiryThreadSummaryResponse> CloseAsync(Guid threadId, CancellationToken cancellationToken = default)
    {
        var thread = await _inquiryRepository.SetStatusAsync(threadId, "Closed", cancellationToken)
            ?? throw new InquiryThreadNotFoundException(threadId);
        return thread.ToSummaryResponse(thread.HasUnreadForStaff);
    }

    public async Task<InquiryThreadSummaryResponse> ReopenAsync(Guid threadId, CancellationToken cancellationToken = default)
    {
        var thread = await _inquiryRepository.SetStatusAsync(threadId, "Open", cancellationToken)
            ?? throw new InquiryThreadNotFoundException(threadId);
        return thread.ToSummaryResponse(thread.HasUnreadForStaff);
    }
}
