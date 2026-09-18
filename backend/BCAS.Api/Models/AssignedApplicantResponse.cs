namespace BCAS.Api.Models;

public class AssignedApplicantResponse
{
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public DateTime SelectedAt { get; set; }
}
