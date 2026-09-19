namespace BCAS.Api.Models;

public class ApplicationStatusHistoryEntryResponse
{
    public Guid HistoryId { get; set; }
    public string? FromStatus { get; set; }
    public string ToStatus { get; set; } = string.Empty;
    public string? Remarks { get; set; }

    /// <summary>Null for the initial submission row, logged by the applicant themselves rather than a staff member.</summary>
    public string? ChangedByName { get; set; }
    public DateTime ChangedAt { get; set; }
}
