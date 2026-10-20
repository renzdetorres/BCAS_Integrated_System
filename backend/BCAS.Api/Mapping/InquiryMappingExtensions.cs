using BCAS.Api.Models;

namespace BCAS.Api.Mapping;

public static class InquiryMappingExtensions
{
    /// <summary>hasUnread is resolved by the caller to the right side's perspective (HasUnreadForApplicant or HasUnreadForStaff).</summary>
    public static InquiryThreadSummaryResponse ToSummaryResponse(this InquiryThread thread, bool hasUnread) => new()
    {
        ThreadId = thread.ThreadId,
        ApplicantName = thread.ApplicantName,
        ApplicantEmail = thread.ApplicantEmail,
        Subject = thread.Subject,
        Status = thread.Status,
        HasUnread = hasUnread,
        LastMessagePreview = thread.LastMessagePreview,
        MessageCount = thread.MessageCount,
        CreatedAt = thread.CreatedAt,
        UpdatedAt = thread.UpdatedAt,
    };

    public static InquiryThreadDetailResponse ToDetailResponse(this InquiryThread thread, IReadOnlyList<InquiryMessage> messages) => new()
    {
        ThreadId = thread.ThreadId,
        ApplicantName = thread.ApplicantName,
        ApplicantEmail = thread.ApplicantEmail,
        Subject = thread.Subject,
        Status = thread.Status,
        CreatedAt = thread.CreatedAt,
        UpdatedAt = thread.UpdatedAt,
        Messages = messages.Select(m => m.ToResponse()).ToList(),
    };

    public static InquiryMessageResponse ToResponse(this InquiryMessage message) => new()
    {
        MessageId = message.MessageId,
        SenderName = message.SenderName,
        IsFromStaff = message.IsFromStaff,
        Body = message.Body,
        CreatedAt = message.CreatedAt,
    };
}
