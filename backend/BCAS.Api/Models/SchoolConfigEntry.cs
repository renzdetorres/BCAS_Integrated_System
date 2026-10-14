namespace BCAS.Api.Models;

public class SchoolConfigEntry
{
    public string ConfigKey { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; }
}

public class UpdateSchoolConfigRequest
{
    /// <summary>The values to save, by ConfigKey. Unknown keys are rejected.</summary>
    public Dictionary<string, string?> Values { get; set; } = new();
}

/// <summary>What the applicant-facing screens need from the school configuration.</summary>
public class AdmissionConfigResponse
{
    public string AcademicYear { get; set; } = string.Empty;
    public int PreKinderMinAge { get; set; }
    public int KinderMinAge { get; set; }
    public int AgeCutoffMonth { get; set; }
    public int AgeCutoffYear { get; set; }
}
