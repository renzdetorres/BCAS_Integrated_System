namespace BCAS.Api.Models;

public class ApplicationLogEntryResponse
{
    public DateTime At { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? Details { get; set; }
    public string? ActorName { get; set; }
}
