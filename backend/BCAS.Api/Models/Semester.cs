namespace BCAS.Api.Models;

public class Semester
{
    public int SemesterId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
}
