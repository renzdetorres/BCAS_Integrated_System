namespace BCAS.Api.Models;

public class DepartmentCount
{
    /// <summary>Null for applications not yet filed under a department.</summary>
    public string? Department { get; set; }
    public int Count { get; set; }
}
