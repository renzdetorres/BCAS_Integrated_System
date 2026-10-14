using BCAS.Api.Models;

namespace BCAS.Api.Tests;

public class SmtpOptionsTests
{
    private static SmtpOptions Configured() => new()
    {
        Host = "smtp.gmail.com",
        Username = "school@gmail.com",
        Password = "abcdefghijklmnop",
        FromAddress = "school@gmail.com",
    };

    [Fact]
    public void Fully_filled_in_settings_have_no_problems()
    {
        Assert.Empty(Configured().Problems());
    }

    [Fact]
    public void The_shipped_placeholders_are_reported_as_missing()
    {
        var shipped = new SmtpOptions
        {
            Host = "REPLACE_WITH_SMTP_HOST",
            Username = "REPLACE_WITH_SMTP_USERNAME",
            Password = "REPLACE_WITH_SMTP_PASSWORD",
            FromAddress = "no-reply@example.edu",
        };

        var problems = shipped.Problems();

        Assert.Equal(4, problems.Count);
        Assert.Contains(problems, p => p.Contains("Smtp__Host"));
        Assert.Contains(problems, p => p.Contains("Smtp__Username"));
        Assert.Contains(problems, p => p.Contains("Smtp__Password"));
        Assert.Contains(problems, p => p.Contains("Smtp__FromAddress"));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void A_blank_password_is_reported(string blank)
    {
        var options = Configured();
        options.Password = blank;

        Assert.Single(options.Problems(), p => p.Contains("Smtp__Password"));
    }

    [Fact]
    public void Only_the_missing_setting_is_reported()
    {
        var options = Configured();
        options.FromAddress = "no-reply@example.edu";

        var problem = Assert.Single(options.Problems());
        Assert.Contains("Smtp__FromAddress", problem);
    }
}
