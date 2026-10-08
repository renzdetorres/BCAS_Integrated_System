namespace BCAS.Api.Models;

public class AssignedApplicantResponse
{
    public Guid UserId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public DateTime SelectedAt { get; set; }
    public string ExamStatus { get; set; } = "Scheduled";
}
