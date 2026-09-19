using BCAS.Api.Exceptions;
using BCAS.Api.Extensions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>Applicant-facing per-type email opt-in/out (BISAASS-24), consumed by NotificationDispatchService (BISAASS-59).</summary>
[Authorize(Roles = "Applicant")]
[ApiController]
[Route("api/notification-preferences")]
public class NotificationPreferencesController : ControllerBase
{
    private readonly INotificationPreferenceService _preferenceService;

    public NotificationPreferencesController(INotificationPreferenceService preferenceService)
    {
        _preferenceService = preferenceService;
    }

    /// <summary>Applicant-only: all seven notification types with the caller's current setting - enabled by default until changed.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<NotificationPreferenceResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<NotificationPreferenceResponse>>> GetMyPreferences(CancellationToken cancellationToken)
    {
        var preferences = await _preferenceService.GetMyPreferencesAsync(User.GetUserId(), cancellationToken);
        return Ok(preferences);
    }

    /// <summary>Applicant-only: opts in or out of one notification type.</summary>
    [HttpPut("{notificationType}")]
    [ProducesResponseType(typeof(NotificationPreferenceResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<NotificationPreferenceResponse>> SetMyPreference(
        string notificationType,
        [FromBody] UpdateNotificationPreferenceRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _preferenceService.SetMyPreferenceAsync(User.GetUserId(), notificationType, request.IsEnabled!.Value, cancellationToken);
            return Ok(updated);
        }
        catch (InvalidNotificationTypeException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid notification type",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
    }
}
