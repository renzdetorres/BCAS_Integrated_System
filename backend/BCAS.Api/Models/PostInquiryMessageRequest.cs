using System.ComponentModel.DataAnnotations;
using BCAS.Api.Constants;

namespace BCAS.Api.Models;

public class PostInquiryMessageRequest
{
    [Required]
    [StringLength(InquiryConstants.MaxBodyLength, MinimumLength = 1)]
    public string Body { get; set; } = string.Empty;
}
