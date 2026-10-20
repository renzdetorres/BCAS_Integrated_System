using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class BulkReviewDocumentsRequest
{
    [Required]
    [MinLength(1)]
    public List<Guid> DocumentIds { get; set; } = new();

    /// <summary>Verified, Rejected, or Flagged, validated server-side against DocumentReviewConstants.AllowedStatuses.</summary>
    [Required]
    public string Status { get; set; } = string.Empty;

    /// <summary>Required when Status is Rejected or Flagged; ignored for Verified. Applied to every document in the batch.</summary>
    [StringLength(500)]
    public string? Reason { get; set; }
}
