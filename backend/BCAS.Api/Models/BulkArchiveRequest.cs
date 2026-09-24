using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class BulkArchiveRequest
{
    [Required]
    [MinLength(1)]
    public List<BulkArchiveItem> Items { get; set; } = new();

    [StringLength(500)]
    public string? Reason { get; set; }
}

public class BulkArchiveItem
{
    [Required]
    public Guid ApplicationId { get; set; }

    /// <summary>Admission or Scholarship - which table ApplicationId belongs to.</summary>
    [Required]
    public string Category { get; set; } = string.Empty;
}
