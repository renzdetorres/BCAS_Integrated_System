namespace BCAS.Api.Services;

public interface IEmailSender
{
    Task SendAsync(string toAddress, string subject, string body, CancellationToken cancellationToken = default);
}
