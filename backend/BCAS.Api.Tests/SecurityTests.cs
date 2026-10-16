using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Http;

namespace BCAS.Api.Tests;

public class AttemptLimiterTests
{
    private static readonly TimeSpan Window = TimeSpan.FromMinutes(10);

    private sealed class Clock
    {
        public DateTime Now { get; set; } = new(2026, 10, 16, 8, 0, 0, DateTimeKind.Utc);
    }

    [Fact]
    public void Attempts_are_allowed_up_to_the_limit_then_refused()
    {
        var limiter = new AttemptLimiter();

        for (var i = 0; i < 3; i++) Assert.True(limiter.TryRecord("k", 3, Window));
        Assert.False(limiter.TryRecord("k", 3, Window));
    }

    [Fact]
    public void A_refused_attempt_is_not_recorded()
    {
        var limiter = new AttemptLimiter();
        for (var i = 0; i < 3; i++) limiter.TryRecord("k", 3, Window);

        limiter.TryRecord("k", 3, Window);

        Assert.Equal(3, limiter.Count("k", Window));
    }

    [Fact]
    public void Keys_are_independent()
    {
        var limiter = new AttemptLimiter();
        for (var i = 0; i < 3; i++) limiter.TryRecord("a", 3, Window);

        Assert.False(limiter.TryRecord("a", 3, Window));
        Assert.True(limiter.TryRecord("b", 3, Window));
    }

    [Fact]
    public void Attempts_expire_once_the_window_has_passed()
    {
        var clock = new Clock();
        var limiter = new AttemptLimiter(() => clock.Now);
        for (var i = 0; i < 3; i++) limiter.TryRecord("k", 3, Window);
        Assert.False(limiter.TryRecord("k", 3, Window));

        clock.Now = clock.Now.AddMinutes(10).AddSeconds(1);

        Assert.True(limiter.TryRecord("k", 3, Window));
    }

    [Fact]
    public void Clear_forgets_a_key()
    {
        var limiter = new AttemptLimiter();
        for (var i = 0; i < 5; i++) limiter.Record("k", Window);

        limiter.Clear("k");

        Assert.Equal(0, limiter.Count("k", Window));
    }

    [Fact]
    public void Retry_after_is_the_time_until_the_oldest_attempt_expires()
    {
        var clock = new Clock();
        var limiter = new AttemptLimiter(() => clock.Now);
        limiter.Record("k", Window);
        clock.Now = clock.Now.AddMinutes(4);
        limiter.Record("k", Window);

        // The first attempt drops out 10 minutes after it was made: 6 minutes from now.
        Assert.Equal(360, limiter.SecondsUntilFree("k", Window));
        Assert.Equal(0, limiter.SecondsUntilFree("unknown", Window));
    }
}

public class JwtSigningKeyTests
{
    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("REPLACE_WITH_A_RANDOM_SECRET_AT_LEAST_32_BYTES_LONG")]
    [InlineData("replace_with_something_long_enough_to_pass_the_length_check")]
    [InlineData("tooshort")]
    public void A_missing_placeholder_or_short_key_is_rejected(string key)
    {
        Assert.NotNull(new JwtOptions { SigningKey = key }.SigningKeyProblem());
    }

    [Fact]
    public void A_long_random_key_is_accepted()
    {
        Assert.Null(new JwtOptions { SigningKey = "k7Tq0vZ9mP2xW4rB6nC8dF1gH3jL5sA7eU9yI0oQ=" }.SigningKeyProblem());
    }
}

public class AuthCookiePolicyTests
{
    [Fact]
    public void A_site_served_over_https_gets_a_secure_lax_cookie()
    {
        var (secure, sameSite) = new AuthCookieOptions { RequireHttps = false }.Resolve(requestIsHttps: true, isDevelopment: false);

        Assert.True(secure);
        Assert.Equal(SameSiteMode.Lax, sameSite);
    }

    [Fact]
    public void The_default_in_production_is_lax_not_none()
    {
        // The old default (RequireHttps true) meant SameSite=None, which lets other sites act as a signed-in user.
        var (_, sameSite) = new AuthCookieOptions().Resolve(requestIsHttps: true, isDevelopment: false);

        Assert.Equal(SameSiteMode.Lax, sameSite);
    }

    [Fact]
    public void Local_development_with_split_origins_keeps_none_and_secure()
    {
        var (secure, sameSite) = new AuthCookieOptions { RequireHttps = true }.Resolve(requestIsHttps: false, isDevelopment: true);

        Assert.True(secure);
        Assert.Equal(SameSiteMode.None, sameSite);
    }

    [Fact]
    public void Plain_http_gets_a_lax_cookie_that_is_not_marked_secure()
    {
        var (secure, sameSite) = new AuthCookieOptions { RequireHttps = false }.Resolve(requestIsHttps: false, isDevelopment: true);

        Assert.False(secure);
        Assert.Equal(SameSiteMode.Lax, sameSite);
    }

    [Theory]
    [InlineData("None", SameSiteMode.None, true)]
    [InlineData("strict", SameSiteMode.Strict, true)]
    [InlineData("Lax", SameSiteMode.Lax, true)]
    public void An_explicit_setting_wins_and_none_is_always_secure(string setting, SameSiteMode expected, bool secureOverHttps)
    {
        var (secure, sameSite) = new AuthCookieOptions { SameSite = setting }.Resolve(requestIsHttps: true, isDevelopment: false);

        Assert.Equal(expected, sameSite);
        Assert.Equal(secureOverHttps, secure);
        Assert.True(new AuthCookieOptions { SameSite = "None" }.Resolve(requestIsHttps: false, isDevelopment: false).Secure);
    }
}
