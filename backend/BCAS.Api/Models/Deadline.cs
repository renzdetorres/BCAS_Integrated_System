namespace BCAS.Api.Models;

public class Deadline
{
    public int DeadlineId { get; set; }
    public string DeadlineType { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public DateOnly DeadlineDate { get; set; }
}
