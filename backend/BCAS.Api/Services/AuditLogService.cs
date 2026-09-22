using System.Security.Claims;
using BCAS.Api.Data;
using BCAS.Api.Extensions;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

/// <summary>
/// Writes to and reads from the system-wide activity log (dbo.AuditLogs).
///
/// What's covered so far: every staff login - Admin, Evaluator, SupportStaff,
/// AcademicHead (AuthController skips Applicant logins deliberately - this is
/// a staff accountability log, not applicant usage telemetry) - and the
/// administrative actions wired up in AdminController, AdminAnnouncementsController,
/// AdminScholarshipsController, and AdminExamSchedulesController - account
/// activation/updates, announcement create/post/deactivate, scholarship
/// create/update/activate/deactivate, exam schedule create/offered-toggle.
///
/// What's NOT covered: every other mutation in the system (document
/// verification, scholarship screening/decisions, exam permits, reservations,
/// etc.) - admission/scholarship status transitions already have their own
/// detailed trail in dbo.ApplicationStatusHistory, and instrumenting every
/// remaining endpoint was out of scope for this pass. Extending coverage is
/// a call to LogAsync at the point each additional action succeeds.
/// </summary>
public class AuditLogService : IAuditLogService
{
    private readonly IAuditLogRepository _repository;
    private readonly ILogger<AuditLogService> _logger;

    public AuditLogService(IAuditLogRepository repository, ILogger<AuditLogService> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public Task LogAsync(ClaimsPrincipal actor, string action, string? details = null, CancellationToken cancellationToken = default)
    {
        var email = actor.GetEmail();
        Guid? userId = null;
        try
        {
            userId = actor.GetUserId();
        }
        catch (Exception)
        {
            // Claims without a parseable "sub" (shouldn't happen for an
            // authenticated request) still get logged by email alone.
        }

        return LogAsync(userId, email, action, details, cancellationToken);
    }

    public async Task LogAsync(Guid? userId, string userEmail, string action, string? details = null, CancellationToken cancellationToken = default)
    {
        // A logging failure (most commonly: this table doesn't exist yet on
        // an environment where the migration hasn't been run) must never
        // break the real action it's recording - same philosophy as
        // NotificationDispatchService for emails. This bug already broke
        // login in production once before this try/catch existed.
        try
        {
            await _repository.InsertAsync(userId, userEmail, action, details, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to write audit log entry ({Action}) for {Email}", action, userEmail);
        }
    }

    public Task<IReadOnlyList<AuditLogEntry>> SearchAsync(
        string? email, int limit, int offset, CancellationToken cancellationToken = default) =>
        _repository.SearchAsync(email, limit, offset, cancellationToken);
}
