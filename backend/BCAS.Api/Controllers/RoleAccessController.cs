using System.Security.Claims;
using BCAS.Api.Constants;
using BCAS.Api.Exceptions;
using BCAS.Api.Extensions;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

public record RoleAccessFeatureResponse(string Key, string Label, string Group, bool IsBlocked);
public record RoleAccessRoleResponse(string Role, IReadOnlyList<RoleAccessFeatureResponse> Features);
public record RoleAccessOverviewResponse(bool CallerIsSuperAdmin, IReadOnlyList<RoleAccessRoleResponse> Roles);
public record SetRoleAccessRequest(string Role, string FeatureKey, bool Blocked);
public record MyAccessResponse(IReadOnlyList<string> BlockedFeatures);

/// <summary>
/// What each role may open. Any Admin can read the matrix; only the Super
/// Admin (the principal) changes it.
/// </summary>
[ApiController]
public class RoleAccessController : ControllerBase
{
    private readonly IRoleAccessService _roleAccess;
    private readonly ISuperAdminGuard _superAdminGuard;
    private readonly IAuditLogService _auditLogService;

    public RoleAccessController(IRoleAccessService roleAccess, ISuperAdminGuard superAdminGuard, IAuditLogService auditLogService)
    {
        _roleAccess = roleAccess;
        _superAdminGuard = superAdminGuard;
        _auditLogService = auditLogService;
    }

    /// <summary>The signed-in user's own blocked pages, so the app can hide them.</summary>
    [Authorize]
    [HttpGet("api/auth/access")]
    public async Task<ActionResult<MyAccessResponse>> GetMine(CancellationToken cancellationToken)
    {
        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        var blocked = await _roleAccess.GetBlockedForUserAsync(User.GetUserId(), role, cancellationToken);
        return Ok(new MyAccessResponse(blocked.ToList()));
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("api/admin/role-access")]
    public async Task<ActionResult<RoleAccessOverviewResponse>> GetOverview(CancellationToken cancellationToken)
    {
        var roles = new List<RoleAccessRoleResponse>();
        foreach (var (role, features) in FeatureCatalog.ByRole)
        {
            var blocked = await _roleAccess.GetBlockedForRoleAsync(role, cancellationToken);
            roles.Add(new RoleAccessRoleResponse(
                role,
                features.Select(f => new RoleAccessFeatureResponse(f.Key, f.Label, f.Group, blocked.Contains(f.Key))).ToList()));
        }

        var isSuperAdmin = await _superAdminGuard.IsSuperAdminAsync(User.GetUserId(), cancellationToken);
        return Ok(new RoleAccessOverviewResponse(isSuperAdmin, roles));
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("api/admin/role-access")]
    public async Task<IActionResult> Set([FromBody] SetRoleAccessRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var applied = await _roleAccess.SetBlockedAsync(User.GetUserId(), request.Role, request.FeatureKey, request.Blocked, cancellationToken);
            if (!applied)
            {
                return BadRequest(new ProblemDetails { Title = "Unknown page", Detail = "That role or page isn't restrictable.", Status = StatusCodes.Status400BadRequest });
            }

            await _auditLogService.LogAsync(
                User, request.Blocked ? "RoleAccessBlocked" : "RoleAccessAllowed", $"{request.Role}: {request.FeatureKey}", cancellationToken);
            return NoContent();
        }
        catch (SuperAdminRequiredException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new ProblemDetails { Title = "Super Admin required", Detail = ex.Message, Status = StatusCodes.Status403Forbidden });
        }
    }
}
