using BCAS.Api.Extensions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using MailKit;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace BCAS.Api.Controllers;

public sealed record EmailStatusResponse(
    bool Configured,
    string Host,
    int Port,
    bool EnableSsl,
    string Username,
    string FromAddress,
    IReadOnlyList<string> Problems);

/// <summary>
/// Lets an Admin see whether the system can send email (password reset links,
/// notifications) and prove it with a test message. The mail password is never
/// returned.
/// </summary>
[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin/email")]
public class AdminEmailController : ControllerBase
{
    private readonly SmtpOptions _smtp;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<AdminEmailController> _logger;

    public AdminEmailController(IOptions<SmtpOptions> smtp, IEmailSender emailSender, ILogger<AdminEmailController> logger)
    {
        _smtp = smtp.Value;
        _emailSender = emailSender;
        _logger = logger;
    }

    [HttpGet("status")]
    [ProducesResponseType(typeof(EmailStatusResponse), StatusCodes.Status200OK)]
    public ActionResult<EmailStatusResponse> Status()
    {
        var problems = _smtp.Problems();
        return Ok(new EmailStatusResponse(
            problems.Count == 0,
            _smtp.Host,
            _smtp.Port,
            _smtp.EnableSsl,
            _smtp.Username,
            _smtp.FromAddress,
            problems));
    }

    /// <summary>Sends a test message to the signed-in Admin's own address and reports the real outcome.</summary>
    [HttpPost("test")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SendTest(CancellationToken cancellationToken)
    {
        var problems = _smtp.Problems();
        if (problems.Count > 0)
        {
            return Problem(string.Join(" ", problems), statusCode: StatusCodes.Status400BadRequest, title: "Email isn't set up yet");
        }

        var to = User.GetEmail();
        try
        {
            await _emailSender.SendAsync(
                to,
                "BCAS test email",
                "If you can read this, the BCAS system can send email. Password reset links and notifications will reach people.",
                cancellationToken);
            return NoContent();
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Test email to {Address} failed", to);
            return Problem(Explain(ex), statusCode: StatusCodes.Status400BadRequest, title: "The test email couldn't be sent");
        }
    }

    /// <summary>A plain-language reason for the usual mail failures, with the server's own wording as the fallback.</summary>
    private static string Explain(Exception ex)
    {
        // The exception that actually says what happened (MailKit wraps some of them).
        var inner = ex;
        while (inner.InnerException is not null && inner is not (AuthenticationException or SmtpCommandException or SslHandshakeException))
        {
            inner = inner.InnerException;
        }

        // Gmail refuses a wrong login by closing the connection with this text, so match the text as well as the type.
        var text = ex.ToString();
        if (text.Contains("5.7.8") || text.Contains("5.7.9") || text.Contains("BadCredentials", StringComparison.OrdinalIgnoreCase) ||
            text.Contains("Username and Password not accepted", StringComparison.OrdinalIgnoreCase))
        {
            return "The mail server rejected the username or password. For Gmail, use a 16-character app password (not your normal password) and your full Gmail address as the username. The app password needs 2-Step Verification turned on.";
        }

        switch (inner)
        {
            case AuthenticationException:
                return "The mail server rejected the username or password. For Gmail, use a 16-character app password (not your normal password) and your full Gmail address as the username. The app password needs 2-Step Verification turned on.";
            case SslHandshakeException:
                return "The secure connection to the mail server failed. Keep SSL on and use port 587 (or 465).";
            case SmtpCommandException command when command.StatusCode == SmtpStatusCode.MailboxUnavailable:
                return $"The mail server refused the sender or recipient address: {command.Message}";
            case SmtpCommandException command:
                return $"The mail server refused the message ({(int)command.StatusCode}): {command.Message}";
            case System.Net.Sockets.SocketException:
            case TimeoutException:
            case OperationCanceledException:
                return "The mail server couldn't be reached. Check the server name and port (Gmail: smtp.gmail.com, 587), and that your host allows outgoing mail.";
            default:
                return $"The mail server said: {ex.GetBaseException().Message}";
        }
    }
}
