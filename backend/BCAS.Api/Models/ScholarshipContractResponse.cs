namespace BCAS.Api.Models;

/// <summary>
/// A printable scholarship record/contract (BISAASS-37) - the frontend
/// renders this as a print-ready page (window.print()); there is no PDF
/// generation on the backend. Only issued for an Approved scholarship
/// application (AdminReportsService.GetContractAsync).
/// </summary>
public class ScholarshipContractResponse
{
    public Guid ApplicationId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public string ScholarshipName { get; set; } = string.Empty;
    public string ScholarshipType { get; set; } = string.Empty;
    public decimal GradeAverage { get; set; }
    public string DecidedByName { get; set; } = string.Empty;
    public DateTime DecidedAt { get; set; }
    public string? Remarks { get; set; }
    public DateTime SubmittedAt { get; set; }
}
