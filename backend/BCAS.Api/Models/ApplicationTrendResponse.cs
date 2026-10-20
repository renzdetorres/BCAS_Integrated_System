namespace BCAS.Api.Models;

/// <summary>Applications submitted per week, oldest first - a continuous series with zero-filled gaps, not just the weeks that had submissions.</summary>
public class ApplicationTrendResponse
{
    public IReadOnlyList<WeeklyTrendPointResponse> Weekly { get; set; } = new List<WeeklyTrendPointResponse>();
}

public class WeeklyTrendPointResponse
{
    public DateOnly WeekStart { get; set; }
    public int AdmissionCount { get; set; }
    public int ScholarshipCount { get; set; }
}
