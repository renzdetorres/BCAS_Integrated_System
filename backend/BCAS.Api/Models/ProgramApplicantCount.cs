namespace BCAS.Api.Models;

public class ProgramApplicantCount
{
    public string Program { get; set; } = string.Empty;
    public int Count { get; set; }
}

/// <summary>
/// Distinct applicants per College program (always all four, in the order
/// defined by DepartmentConstants), plus how many applied with a college
/// course that isn't one of them.
/// </summary>
public class ProgramBreakdown
{
    public IReadOnlyList<ProgramApplicantCount> Programs { get; set; } = Array.Empty<ProgramApplicantCount>();
    public int OtherApplicants { get; set; }
}
