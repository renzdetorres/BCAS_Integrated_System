namespace BCAS.Api.Models;

public class AdmissionApplication
{
    public Guid ApplicationId { get; set; }
    public Guid UserId { get; set; }
    public string ApplicationType { get; set; } = string.Empty;
    public string CourseAppliedFor { get; set; } = string.Empty;
    public string? Department { get; set; }
    public string PreviousSchool { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }

    /// <summary>The entrance-exam form answers; empty fields on applications filed before the form existed.</summary>
    public AdmissionFormDetails Form { get; set; } = new();
}
