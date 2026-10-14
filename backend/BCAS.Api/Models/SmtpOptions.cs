namespace BCAS.Api.Models;

/// <summary>SMTP relay settings for NotificationDispatchService's outgoing email (BISAASS-59).</summary>
public class SmtpOptions
{
    public const string SectionName = "Smtp";

    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public bool EnableSsl { get; set; } = true;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FromAddress { get; set; } = string.Empty;
    public string FromName { get; set; } = "BCAS Admissions & Scholarships";

    private static bool IsPlaceholder(string value) =>
        string.IsNullOrWhiteSpace(value) || value.StartsWith("REPLACE_WITH", StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// What still has to be filled in before email can be sent: the setting
    /// is blank or still the "REPLACE_WITH..." placeholder from appsettings.json.
    /// Empty when everything needed is present (it doesn't prove the login is right - the test email does).
    /// </summary>
    public IReadOnlyList<string> Problems()
    {
        var problems = new List<string>();
        if (IsPlaceholder(Host)) problems.Add("The mail server (Smtp__Host) isn't set.");
        if (IsPlaceholder(Username)) problems.Add("The mail username (Smtp__Username) isn't set. For Gmail it's your full Gmail address.");
        if (IsPlaceholder(Password)) problems.Add("The mail password (Smtp__Password) isn't set. For Gmail use a 16-character app password, not your normal password.");
        if (IsPlaceholder(FromAddress) || FromAddress.EndsWith("@example.edu", StringComparison.OrdinalIgnoreCase))
        {
            problems.Add("The sender address (Smtp__FromAddress) isn't set. For Gmail it must be the same Gmail address as the username.");
        }

        return problems;
    }
}
