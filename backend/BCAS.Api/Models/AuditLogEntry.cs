namespace BCAS.Api.Models;

/// <summary>
/// One row of the system-wide activity log: who (by email, kept even if the
/// account is later renamed/removed), what they did, and when. Covers login
/// events and the administrative changes wired up in AuditLogService - not
/// every possible database write in the system (see AuditLogService's own
/// summary comment for exactly what's covered).
/// </summary>
public class AuditLogEntry
{
    public Guid AuditLogId { get; set; }
    public Guid? UserId { get; set; }
    public string UserEmail { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string? Details { get; set; }
    public DateTime CreatedAt { get; set; }
}
