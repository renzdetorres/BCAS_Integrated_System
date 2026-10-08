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

/// <summary>A brother or sister listed on the form.</summary>
public class Sibling
{
    [StringLength(200)]
    public string? Name { get; set; }

    [Range(0, 120)]
    public int? Age { get; set; }

    [StringLength(100)]
    public string? Occupation { get; set; }

    /// <summary>School, or place of work.</summary>
    [StringLength(200)]
    public string? SchoolOrWork { get; set; }
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
    public FamilyMember Guardian { get; set; } = new();

    public List<Sibling> Siblings { get; set; } = new();

    /// <summary>The student's signature over printed name, typed.</summary>
    [StringLength(200)]
    public string? StudentSignature { get; set; }

    /// <summary>The parent's or guardian's signature over printed name, typed.</summary>
    [StringLength(200)]
    public string? GuardianSignature { get; set; }
}
