namespace BCAS.Api.Models;

/// <summary>An applicant who has selected a given exam schedule (BISAASS-29).</summary>
public class AssignedApplicant
{
    public Guid UserId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public DateTime SelectedAt { get; set; }
}
