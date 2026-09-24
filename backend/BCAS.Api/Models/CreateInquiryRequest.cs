using System.ComponentModel.DataAnnotations;
using BCAS.Api.Constants;

namespace BCAS.Api.Models;

public class CreateInquiryRequest
{
    [Required]
    [StringLength(InquiryConstants.MaxSubjectLength, MinimumLength = 1)]
    public string Subject { get; set; } = string.Empty;

    [Required]
    [StringLength(InquiryConstants.MaxBodyLength, MinimumLength = 1)]
    public string Body { get; set; } = string.Empty;
}
