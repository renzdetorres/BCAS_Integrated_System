using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class ReviewDocumentRequest
{
    /// <summary>Verified, Rejected, or Flagged, validated server-side against DocumentReviewConstants.AllowedStatuses.</summary>
    [Required]
    public string Status { get; set; } = string.Empty;

    /// <summary>Required when Status is Rejected or Flagged; ignored for Verified.</summary>
    [StringLength(500)]
    public string? Reason { get; set; }
}
