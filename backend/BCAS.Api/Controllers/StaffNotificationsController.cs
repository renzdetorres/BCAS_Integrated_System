using System.ComponentModel.DataAnnotations;
using BCAS.Api.Data;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

public class SendStaffNotificationRequest
{
    [Required]
    public Guid UserId { get; set; }

    [Required, StringLength(120, MinimumLength = 1)]
    public string Subject { get; set; } = string.Empty;

    [Required, StringLength(1000, MinimumLength = 1)]
    public string Message { get; set; } = string.Empty;
}

/// <summary>
/// Lets Support Staff (and Admin) write to one applicant directly - for example
/// to chase a missing document or remind them of their exam. The applicant gets
/// a system notification and an email. The system's own automatic notifications
/// are unaffected; this is the staff member's hand-written one.
/// </summary>
[Authorize(Roles = "SupportStaff,Admin")]
[ApiController]
[Route("api/staff/notifications")]
public class StaffNotificationsController : ControllerBase
{
    private readonly IUserRepository _userRepository;
    private readonly INotificationDispatchService _notifications;
    private readonly IAuditLogService _auditLog;

    public StaffNotificationsController(
        IUserRepository userRepository,
        INotificationDispatchService notifications,
        IAuditLogService auditLog)
    {
        _userRepository = userRepository;
        _notifications = notifications;
        _auditLog = auditLog;
    }

    [HttpPost]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Send([FromBody] SendStaffNotificationRequest request, CancellationToken cancellationToken)
    {
        var applicant = await _userRepository.GetByIdAsync(request.UserId, cancellationToken);
        if (applicant is null)
        {
            return NotFound(new ProblemDetails { Title = "Applicant not found", Status = StatusCodes.Status404NotFound });
        }

        if (applicant.RoleName != "Applicant" || !applicant.IsActive)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Not an active applicant",
                Detail = "Notifications from here go to active applicant accounts only.",
                Status = StatusCodes.Status400BadRequest,
            });
        }

        var subject = request.Subject.Trim();
        var message = request.Message.Trim();
        if (subject.Length == 0 || message.Length == 0)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Write a subject and a message",
                Detail = "Both the subject and the message are required.",
                Status = StatusCodes.Status400BadRequest,
            });
        }

        await _notifications.NotifyStaffMessageAsync(applicant.UserId, applicant.Email, applicant.FirstName, subject, message, cancellationToken);
        await _auditLog.LogAsync(User, "ApplicantNotified", $"{applicant.Email}: {subject}", cancellationToken);
        return NoContent();
    }
}
