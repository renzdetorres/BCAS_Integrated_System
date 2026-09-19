namespace BCAS.Api.Models;

/// <summary>One recorded status change (or the initial submission) for an admission or scholarship application (BISAASS-56).</summary>
public class ApplicationStatusHistoryEntry
{
    public Guid HistoryId { get; set; }
    public Guid ApplicationId { get; set; }
    public string Category { get; set; } = string.Empty;

    /// <summary>Null for the initial submission row - there is no prior status to have come from.</summary>
    public string? FromStatus { get; set; }
    public string ToStatus { get; set; } = string.Empty;
    public string? Remarks { get; set; }

    /// <summary>Null for the initial submission row, logged by the system rather than a staff member.</summary>
    public Guid? ChangedByUserId { get; set; }
    public string? ChangedByName { get; set; }
    public DateTime ChangedAt { get; set; }
}
