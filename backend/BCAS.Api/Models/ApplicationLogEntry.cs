namespace BCAS.Api.Models;

/// <summary>One line of an application's log: who did what, and when.</summary>
public class ApplicationLogEntry
{
    public DateTime At { get; set; }

    /// <summary>A short sentence, e.g. "Application submitted" or "Documents reviewed".</summary>
    public string Action { get; set; } = string.Empty;
    public string? Details { get; set; }

    /// <summary>Null when the applicant or the system did it.</summary>
    public string? ActorName { get; set; }
}
