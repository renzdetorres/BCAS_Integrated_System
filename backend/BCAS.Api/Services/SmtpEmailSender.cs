using System.Net;
using System.Net.Mail;
using BCAS.Api.Models;
using Microsoft.Extensions.Options;

namespace BCAS.Api.Services;

/// <summary>
/// Plain SMTP relay via the .NET BCL's SmtpClient - no extra package
/// dependency for what's a simple send-and-forget text email. Configured
/// via the "Smtp" appsettings section (SmtpOptions).
/// </summary>
public class SmtpEmailSender : IEmailSender
{
    private readonly SmtpOptions _options;

    public SmtpEmailSender(IOptions<SmtpOptions> options)
    {
        _options = options.Value;
    }

    public async Task SendAsync(string toAddress, string subject, string body, CancellationToken cancellationToken = default)
    {
        using var client = new SmtpClient(_options.Host, _options.Port)
        {
            EnableSsl = _options.EnableSsl,
            Credentials = string.IsNullOrEmpty(_options.Username)
                ? null
                : new NetworkCredential(_options.Username, _options.Password),
        };

        using var message = new MailMessage
        {
            From = new MailAddress(_options.FromAddress, _options.FromName),
            Subject = subject,
            Body = body,
            IsBodyHtml = false,
        };
        message.To.Add(toAddress);

        await client.SendMailAsync(message, cancellationToken);
    }
}
