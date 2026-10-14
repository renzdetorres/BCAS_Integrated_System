using BCAS.Api.Data;
using BCAS.Api.Extensions;
using BCAS.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>The applicant's in-app (system) notifications - the same events that are also emailed.</summary>
[Authorize(Roles = "Applicant")]
[ApiController]
[Route("api/notifications")]
public class NotificationsController : ControllerBase
{
    private const int InboxSize = 20;

    private readonly INotificationInboxRepository _inbox;

    public NotificationsController(INotificationInboxRepository inbox)
    {
        _inbox = inbox;
    }

    /// <summary>The 20 newest notifications and the total unread count.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(NotificationInboxResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<NotificationInboxResponse>> GetInbox(CancellationToken cancellationToken)
    {
        var (items, unread) = await _inbox.GetRecentAsync(User.GetUserId(), InboxSize, cancellationToken);
        return Ok(new NotificationInboxResponse
        {
            UnreadCount = unread,
            Items = items
                .Select(n => new NotificationResponse
                {
                    NotificationId = n.NotificationId,
                    EventType = n.EventType,
                    Title = n.Title,
                    Body = n.Body,
                    IsRead = n.IsRead,
                    CreatedAt = n.CreatedAt,
                })
                .ToList(),
        });
    }

    [HttpPost("{notificationId:guid}/read")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> MarkRead(Guid notificationId, CancellationToken cancellationToken)
    {
        await _inbox.MarkReadAsync(User.GetUserId(), notificationId, cancellationToken);
        return NoContent();
    }

    [HttpPost("read-all")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> MarkAllRead(CancellationToken cancellationToken)
    {
        await _inbox.MarkAllReadAsync(User.GetUserId(), cancellationToken);
        return NoContent();
    }
}
