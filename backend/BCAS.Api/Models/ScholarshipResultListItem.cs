namespace BCAS.Api.Models;

/// <summary>
/// One row of the Scholarship Results report (BISAASS-37) - a scholarship
/// application whose Status is Approved or Rejected. Decision/DecidedBy/
/// DecidedAt come from ScholarshipFinalDecisions (BISAASS-47) when a row
/// exists there; Status alone is the authoritative source (an Admin-Registrar
/// override via AdminApplicationsService.UpdateStatusAsync can set Approved/
/// Rejected without going through that table), so those three stay null
/// when no such row exists rather than the whole application being excluded.
/// Also backs the printable Scholarship Contract (same shape, one row).
/// </summary>
public class ScholarshipResultListItem
{
    public Guid ApplicationId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public string ScholarshipName { get; set; } = string.Empty;
    public string ScholarshipType { get; set; } = string.Empty;
    public decimal GradeAverage { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Decision { get; set; }
    public string? DecisionRemarks { get; set; }
    public string? DecidedByName { get; set; }
    public DateTime? DecidedAt { get; set; }
    public DateTime SubmittedAt { get; set; }
}
