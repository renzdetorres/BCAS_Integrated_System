using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

/// <summary>One level on the Admission Slots screen: its limit (if any) and how many applications already take a slot.</summary>
public class AdmissionLevelSlotResponse
{
    public string Category { get; set; } = string.Empty;
    public string Level { get; set; } = string.Empty;

    /// <summary>The number of slots, or null when the level has no limit.</summary>
    public int? Slots { get; set; }

    /// <summary>Applications for this level in the current academic year that are not rejected or retracted.</summary>
    public int Taken { get; set; }

    /// <summary>Slots still free (never below 0), or null when the level has no limit.</summary>
    public int? Remaining { get; set; }

    public bool IsFull { get; set; }
}

public class AdmissionLevelSlotInput
{
    [Required]
    [StringLength(60)]
    public string Category { get; set; } = string.Empty;

    [Required]
    [StringLength(80)]
    public string Level { get; set; } = string.Empty;

    /// <summary>Blank for no limit.</summary>
    [Range(0, AdmissionLimit)]
    public int? Slots { get; set; }

    public const int AdmissionLimit = 100_000;
}

public class UpdateAdmissionSlotsRequest
{
    [Required]
    public List<AdmissionLevelSlotInput> Levels { get; set; } = new();
}

/// <summary>What an applicant is told about a level: only whether it is full, never the counts.</summary>
public class AdmissionSlotAvailabilityResponse
{
    public string Category { get; set; } = string.Empty;
    public string Level { get; set; } = string.Empty;
    public bool IsFull { get; set; }
    public string? Message { get; set; }
}
