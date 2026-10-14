using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class UpdateApplicationStatusRequest
{
    /// <summary>Admission or Scholarship - which table ApplicationId belongs to.</summary>
    [Required]
    public string? Category { get; set; }

    /// <summary>Validated server-side against the allowed set for the given Category.</summary>
    [Required]
    public string? Status { get; set; }

    [StringLength(1000)]
    public string? Remarks { get; set; }

    /// <summary>
    /// Set by server code that sends its own, more specific notification (an exam
    /// or interview result), so the applicant isn't emailed twice. Never read from the request body.
    /// </summary>
    [System.Text.Json.Serialization.JsonIgnore]
    public bool SuppressNotification { get; set; }
}
