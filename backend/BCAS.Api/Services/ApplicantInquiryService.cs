using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class ApplicantInquiryService : IApplicantInquiryService
{
    private readonly IInquiryRepository _inquiryRepository;

    public ApplicantInquiryService(IInquiryRepository inquiryRepository)
    {
        _inquiryRepository = inquiryRepository;
    }

    public async Task<IReadOnlyList<InquiryThreadSummaryResponse>> GetMyThreadsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var threads = await _inquiryRepository.GetThreadsByUserIdAsync(userId, cancellationToken);
        return threads.Select(t => t.ToSummaryResponse(t.HasUnreadForApplicant)).ToList();
    }

    public async Task<InquiryThreadDetailResponse> GetMyThreadDetailAsync(
        Guid userId, Guid threadId, CancellationToken cancellationToken = default)
    {
        var thread = await _inquiryRepository.GetByIdAsync(threadId, userId, cancellationToken)
            ?? throw new InquiryThreadNotFoundException(threadId);

        await _inquiryRepository.MarkReadAsync(threadId, forStaff: false, cancellationToken);

        var messages = await _inquiryRepository.GetMessagesByThreadIdAsync(threadId, cancellationToken);
        return thread.ToDetailResponse(messages);
    }

    public async Task<InquiryThreadDetailResponse> CreateThreadAsync(
        Guid userId, CreateInquiryRequest request, CancellationToken cancellationToken = default)
    {
        var threadId = await _inquiryRepository.CreateThreadAsync(userId, request.Subject.Trim(), request.Body.Trim(), cancellationToken);

        var thread = await _inquiryRepository.GetByIdAsync(threadId, userId, cancellationToken)
            ?? throw new InquiryThreadNotFoundException(threadId);
        var messages = await _inquiryRepository.GetMessagesByThreadIdAsync(threadId, cancellationToken);
        return thread.ToDetailResponse(messages);
    }

    public async Task<InquiryThreadDetailResponse> PostMessageAsync(
        Guid userId, Guid threadId, PostInquiryMessageRequest request, CancellationToken cancellationToken = default)
    {
        _ = await _inquiryRepository.GetByIdAsync(threadId, userId, cancellationToken)
            ?? throw new InquiryThreadNotFoundException(threadId);

        await _inquiryRepository.PostMessageAsync(threadId, userId, isFromStaff: false, request.Body.Trim(), cancellationToken);

        var thread = await _inquiryRepository.GetByIdAsync(threadId, userId, cancellationToken)
            ?? throw new InquiryThreadNotFoundException(threadId);
        var messages = await _inquiryRepository.GetMessagesByThreadIdAsync(threadId, cancellationToken);
        return thread.ToDetailResponse(messages);
    }
}
