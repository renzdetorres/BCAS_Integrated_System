namespace BCAS.Api.Models;

/// <summary>Summary of Enrollment (BISAASS-37) - counts over the same Enrollment List rows, grouped two ways.</summary>
public class EnrollmentSummaryResponse
{
    public int TotalEnrolled { get; set; }
    public IReadOnlyList<ProgramCountResponse> ByProgram { get; set; } = Array.Empty<ProgramCountResponse>();
    public IReadOnlyList<ApplicationTypeCountResponse> ByApplicationType { get; set; } = Array.Empty<ApplicationTypeCountResponse>();
}
