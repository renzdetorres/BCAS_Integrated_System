namespace BCAS.Api.Models;

/// <summary>An application's entrance-exam form as the registrar reads it: the form answers plus the profile details printed on the paper form.</summary>
public class AdminEntranceFormResponse
{
    public string ApplicantName { get; set; } = string.Empty;
    public DateOnly? BirthDate { get; set; }
    public string? Address { get; set; }
    public string? ContactNumber { get; set; }
    public string ApplicationType { get; set; } = string.Empty;
    public string CourseAppliedFor { get; set; } = string.Empty;
    public string? Department { get; set; }
    public string PreviousSchool { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }

    /// <summary>False for applications filed before the form existed (all form fields are then empty).</summary>
    public bool HasFormDetails { get; set; }
    public AdmissionFormDetails Form { get; set; } = new();
}
