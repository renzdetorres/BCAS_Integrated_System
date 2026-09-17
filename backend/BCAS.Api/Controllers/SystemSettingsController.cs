using BCAS.Api.Exceptions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>
/// Admin-Registrar system-level configuration (BISAASS-40). Restricted to
/// Admin, same as the rest of the admin-only surface (staff provisioning,
/// account management, notification settings).
/// </summary>
[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin/system-settings")]
public class SystemSettingsController : ControllerBase
{
    private readonly ISystemSettingsService _systemSettingsService;

    public SystemSettingsController(ISystemSettingsService systemSettingsService)
    {
        _systemSettingsService = systemSettingsService;
    }

    /// <summary>Admin-only: lists every configurable system setting and its current on/off state.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<SystemSettingResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SystemSettingResponse>>> ListSettings(CancellationToken cancellationToken)
    {
        var settings = await _systemSettingsService.ListSettingsAsync(cancellationToken);
        return Ok(settings);
    }

    /// <summary>
    /// Admin-only: turns a system setting on or off. Read fresh on every
    /// check rather than cached, so the change applies to the very next
    /// admission/scholarship application submitted after it.
    /// </summary>
    [HttpPatch("{settingKey}")]
    [ProducesResponseType(typeof(SystemSettingResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SystemSettingResponse>> SetSettingEnabled(
        string settingKey,
        [FromBody] UpdateSystemSettingRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var response = await _systemSettingsService.SetSettingEnabledAsync(settingKey, request.IsEnabled!.Value, cancellationToken);
            return Ok(response);
        }
        catch (SystemSettingNotFoundException ex)
        {
            return NotFound(new ProblemDetails
            {
                Title = "System setting not found",
                Detail = ex.Message,
                Status = StatusCodes.Status404NotFound,
            });
        }
    }
}
