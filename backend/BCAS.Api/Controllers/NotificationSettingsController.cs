using BCAS.Api.Exceptions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin/notification-settings")]
public class NotificationSettingsController : ControllerBase
{
    private readonly INotificationSettingsService _notificationSettingsService;

    public NotificationSettingsController(INotificationSettingsService notificationSettingsService)
    {
        _notificationSettingsService = notificationSettingsService;
    }

    /// <summary>Admin-only: lists every configurable notification trigger and its current on/off state.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<NotificationTriggerConfigResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<NotificationTriggerConfigResponse>>> ListTriggers(CancellationToken cancellationToken)
    {
        var triggers = await _notificationSettingsService.ListTriggersAsync(cancellationToken);
        return Ok(triggers);
    }

    /// <summary>
    /// Admin-only: turns a notification trigger on or off. Read fresh on
    /// every check rather than cached, so the change applies starting with
    /// the next notification event of that kind.
    /// </summary>
    [HttpPatch("{triggerKey}")]
    [ProducesResponseType(typeof(NotificationTriggerConfigResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<NotificationTriggerConfigResponse>> SetTriggerEnabled(
        string triggerKey,
        [FromBody] UpdateNotificationTriggerRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var response = await _notificationSettingsService.SetTriggerEnabledAsync(triggerKey, request.IsEnabled!.Value, cancellationToken);
            return Ok(response);
        }
        catch (NotificationTriggerNotFoundException ex)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Notification trigger not found",
                Detail = ex.Message,
                Status = StatusCodes.Status404NotFound,
            });
        }
    }
}
