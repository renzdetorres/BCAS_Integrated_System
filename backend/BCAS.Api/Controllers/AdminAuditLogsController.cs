using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>Admin-only: the system-wide login/change activity log.</summary>
[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin/audit-logs")]
public class AdminAuditLogsController : ControllerBase
{
    private readonly IAuditLogService _auditLogService;

    public AdminAuditLogsController(IAuditLogService auditLogService)
    {
        _auditLogService = auditLogService;
    }

    /// <summary>
    /// Most recent activity first, optionally filtered to one email (partial
    /// match). See AuditLogService's summary comment for what's covered.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AuditLogEntry>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AuditLogEntry>>> Search(
        [FromQuery] string? email,
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0,
        CancellationToken cancellationToken = default)
    {
        var clampedLimit = Math.Clamp(limit, 1, 200);
        var clampedOffset = Math.Max(offset, 0);
        var entries = await _auditLogService.SearchAsync(email, clampedLimit, clampedOffset, cancellationToken);
        return Ok(entries);
    }
}
