namespace BCAS.Api.Models;

public class SemesterResponse
{
    public int SemesterId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }

    /// <summary>Today (Philippine time) falls within StartDate..EndDate.</summary>
    public bool IsOngoing { get; set; }
}

/// <summary>
/// The school calendar as the scholarship lock sees it, plus whether the
/// caller may override the lock and manage semesters.
/// </summary>
public class SemesterOverviewResponse
{
    public IReadOnlyList<SemesterResponse> Semesters { get; set; } = Array.Empty<SemesterResponse>();

    /// <summary>The semester in progress today, or null - while set, scholarships are locked.</summary>
    public SemesterResponse? Ongoing { get; set; }

    public bool CallerIsSuperAdmin { get; set; }
}
