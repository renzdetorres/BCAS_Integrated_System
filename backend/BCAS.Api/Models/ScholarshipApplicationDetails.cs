namespace BCAS.Api.Models;

/// <summary>The form answers stored with a scholarship application (all null on applications filed before the form existed).</summary>
public class ScholarshipApplicationDetails
{
    public string? LevelApplied { get; set; }
    public string? ApplicantFullName { get; set; }
    public string? SchoolLastAttended { get; set; }
    public string? GuardianRole { get; set; }
    public string? GuardianName { get; set; }
    public string? GuardianContact { get; set; }
    public string? GuardianEmail { get; set; }
    public bool? ConsentTerms { get; set; }
    public bool? ConsentParticipation { get; set; }
    public bool? ConsentCertification { get; set; }
    public DateTime? ConsentedAt { get; set; }
}
