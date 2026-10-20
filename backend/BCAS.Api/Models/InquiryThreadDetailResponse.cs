namespace BCAS.Api.Models;

public class InquiryThreadDetailResponse
{
    public Guid ThreadId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public IReadOnlyList<InquiryMessageResponse> Messages { get; set; } = new List<InquiryMessageResponse>();
}

public class InquiryMessageResponse
{
    public Guid MessageId { get; set; }
    public string SenderName { get; set; } = string.Empty;
    public bool IsFromStaff { get; set; }
    public string Body { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
