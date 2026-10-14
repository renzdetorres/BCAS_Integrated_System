using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

/// <summary>One of the student's parents or guardian, as on the paper entrance-exam form.</summary>
public class FamilyMember
{
    [StringLength(200)]
    public string? Name { get; set; }

    [StringLength(100)]
    public string? Occupation { get; set; }

    [StringLength(50)]
    public string? Phone { get; set; }
}

/// <summary>
/// The fields of the school's "Application Form for Entrance Exam" that are not
/// already part of the application or the applicant's profile.
/// </summary>
public class AdmissionFormDetails
{
    /// <summary>Male or Female.</summary>
    [StringLength(10)]
    public string? Sex { get; set; }

    [StringLength(200)]
    public string? PlaceOfBirth { get; set; }

    /// <summary>Address of the school last attended (its name is PreviousSchool).</summary>
    [StringLength(300)]
    public string? PreviousSchoolAddress { get; set; }

    [StringLength(300)]
    public string? SpecialSkills { get; set; }

    public FamilyMember Father { get; set; } = new();
    public FamilyMember Mother { get; set; } = new();

    /// <summary>The mother's maiden name, as on the PSA birth certificate.</summary>
    [StringLength(200)]
    public string? MotherMaidenName { get; set; }
    public FamilyMember Guardian { get; set; } = new();

    /// <summary>Grade level or year level, e.g. "Grade 7" or "1st Year".</summary>
    [StringLength(40)]
    public string? YearLevel { get; set; }

    /// <summary>The term (High School, Senior High School) or semester (College) applied for.</summary>
    [StringLength(40)]
    public string? AcademicTerm { get; set; }

    /// <summary>Set by the server from the admission settings, e.g. "2026-2027".</summary>
    [StringLength(9)]
    public string? AcademicYear { get; set; }

    /// <summary>The student's signature over printed name, typed.</summary>
    [StringLength(200)]
    public string? StudentSignature { get; set; }

    /// <summary>The parent's or guardian's signature over printed name, typed.</summary>
    [StringLength(200)]
    public string? GuardianSignature { get; set; }
}
