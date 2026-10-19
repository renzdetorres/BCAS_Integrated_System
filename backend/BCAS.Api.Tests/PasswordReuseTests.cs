using System.ComponentModel.DataAnnotations;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;

namespace BCAS.Api.Tests;

public class PasswordReuseTests
{
    private const string CurrentPassword = "tulip-River-88";
    private const string RawToken = "raw-reset-token";

    // A stand-in for an interface: every call goes to the handler, so a test only wires up what the code under test uses.
    public class Stub : DispatchProxy
    {
        public Func<string, object?[], object?> Handler { get; set; } = (name, _) => throw new NotSupportedException(name);

        protected override object? Invoke(MethodInfo? targetMethod, object?[]? args) => Handler(targetMethod!.Name, args ?? []);

        public static T Of<T>(Func<string, object?[], object?> handler) where T : class
        {
            var proxy = Create<T, Stub>();
            ((Stub)(object)proxy).Handler = handler;
            return proxy;
        }
    }

    private sealed class Fixture
    {
        public Guid UserId { get; } = Guid.NewGuid();
        public MemoryCache Cache { get; } = new(new MemoryCacheOptions());
        public AttemptLimiter Limiter { get; } = new();
        public List<(string To, string Subject, string Body)> Emails { get; } = new();
        private readonly TaskCompletionSource<bool> _emailSent = new(TaskCreationOptions.RunContinuationsAsynchronously);

        /// <summary>The email goes out on a background task; waits (briefly) for it.</summary>
        public async Task WaitForEmailAsync() => await _emailSent.Task.WaitAsync(TimeSpan.FromSeconds(5));

        public User User { get; }
        public string? SavedHash { get; private set; }
        public bool TokenUsed { get; private set; }
        public AuthService Service { get; }

        public Fixture(bool knownToken = true)
        {
            // Work factor 4 keeps the test fast; Verify reads the factor from the hash itself.
            User = new User { UserId = UserId, Email = "maria@example.com", IsActive = true, PasswordHash = BCrypt.Net.BCrypt.HashPassword(CurrentPassword, workFactor: 4) };

            var users = Stub.Of<IUserRepository>((name, args) => name switch
            {
                nameof(IUserRepository.GetByIdAsync) => Task.FromResult<User?>(User),
                nameof(IUserRepository.UpdatePasswordHashAsync) => Save((string)args[1]!),
                _ => throw new NotSupportedException(name),
            });

            var tokens = Stub.Of<IPasswordResetTokenRepository>((name, args) => name switch
            {
                // A token stops being valid once it has been marked used, as in the real table.
                nameof(IPasswordResetTokenRepository.GetValidUserIdAsync) =>
                    Task.FromResult<Guid?>(knownToken && !TokenUsed && (string)args[0]! == HashToken(RawToken) ? UserId : null),
                nameof(IPasswordResetTokenRepository.MarkUsedAsync) => MarkUsed(),
                _ => throw new NotSupportedException(name),
            });

            Service = new AuthService(
                users,
                Stub.Of<ITokenService>((name, _) => name switch
                {
                    nameof(ITokenService.GenerateToken) => ("fresh-token", DateTime.UtcNow.AddHours(1)),
                    _ => throw new NotSupportedException(name),
                }),
                tokens,
                Stub.Of<IEmailSender>((name, args) =>
                {
                    Emails.Add(((string)args[0]!, (string)args[1]!, (string)args[2]!));
                    _emailSent.TrySetResult(true);
                    return Task.CompletedTask;
                }),
                Stub.Of<IHostEnvironment>((name, _) => throw new NotSupportedException(name)),
                Cache,
                Limiter,
                NullLogger<AuthService>.Instance);
        }

        private Task Save(string hash)
        {
            SavedHash = hash;
            return Task.CompletedTask;
        }

        private Task MarkUsed()
        {
            TokenUsed = true;
            return Task.CompletedTask;
        }

        private static string HashToken(string rawToken) =>
            Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));
    }

    [Fact]
    public async Task Reset_to_the_current_password_is_refused_and_nothing_is_saved()
    {
        var fixture = new Fixture();

        var ex = await Assert.ThrowsAsync<NewPasswordSameAsCurrentException>(
            () => fixture.Service.ResetPasswordAsync(RawToken, CurrentPassword));

        Assert.Equal("That's your current password. Please choose a new one.", ex.Message);
        Assert.Null(fixture.SavedHash);
    }

    [Fact]
    public async Task A_refused_reset_leaves_the_link_usable_for_another_try()
    {
        var fixture = new Fixture();

        await Assert.ThrowsAsync<NewPasswordSameAsCurrentException>(
            () => fixture.Service.ResetPasswordAsync(RawToken, CurrentPassword));
        Assert.False(fixture.TokenUsed);

        await fixture.Service.ResetPasswordAsync(RawToken, "N0t-So-Simple!");

        Assert.True(fixture.TokenUsed);
        Assert.True(BCrypt.Net.BCrypt.Verify("N0t-So-Simple!", fixture.SavedHash));
    }

    [Fact]
    public async Task Reset_to_a_different_password_saves_it_and_uses_up_the_token()
    {
        var fixture = new Fixture();

        await fixture.Service.ResetPasswordAsync(RawToken, "Verify#12345");

        Assert.True(BCrypt.Net.BCrypt.Verify("Verify#12345", fixture.SavedHash));
        Assert.True(fixture.TokenUsed);
    }

    [Fact]
    public async Task An_unknown_token_still_gets_the_generic_invalid_link_answer()
    {
        var fixture = new Fixture(knownToken: false);

        // The same-password message is only reachable with a valid token, so it can't be used to probe accounts.
        await Assert.ThrowsAsync<InvalidOrExpiredResetTokenException>(
            () => fixture.Service.ResetPasswordAsync(RawToken, CurrentPassword));
        Assert.Null(fixture.SavedHash);
    }

    [Fact]
    public async Task Change_to_the_current_password_is_refused_and_nothing_is_saved()
    {
        var fixture = new Fixture();
        var request = new ChangePasswordRequest { CurrentPassword = CurrentPassword, NewPassword = CurrentPassword };

        await Assert.ThrowsAsync<NewPasswordSameAsCurrentException>(
            () => fixture.Service.ChangePasswordAsync(fixture.UserId, request));

        Assert.Null(fixture.SavedHash);
    }

    [Fact]
    public async Task Change_with_a_wrong_current_password_is_still_reported_as_that()
    {
        var fixture = new Fixture();
        var request = new ChangePasswordRequest { CurrentPassword = "not-the-password-1", NewPassword = CurrentPassword };

        await Assert.ThrowsAsync<IncorrectCurrentPasswordException>(
            () => fixture.Service.ChangePasswordAsync(fixture.UserId, request));
    }

    [Fact]
    public async Task Change_to_a_different_password_is_saved()
    {
        var fixture = new Fixture();
        var request = new ChangePasswordRequest { CurrentPassword = CurrentPassword, NewPassword = "Verify#12345" };

        await fixture.Service.ChangePasswordAsync(fixture.UserId, request);

        Assert.True(BCrypt.Net.BCrypt.Verify("Verify#12345", fixture.SavedHash));
    }

    [Fact]
    public async Task A_change_signs_out_other_sessions_hands_back_a_fresh_login_and_emails_the_owner()
    {
        var fixture = new Fixture();
        fixture.Cache.Set(AuthConstants.SessionCacheKey(fixture.UserId), "cached account");
        var request = new ChangePasswordRequest { CurrentPassword = CurrentPassword, NewPassword = "Verify#12345" };

        var session = await fixture.Service.ChangePasswordAsync(fixture.UserId, request);

        Assert.Equal("fresh-token", session.Token);
        Assert.False(fixture.Cache.TryGetValue(AuthConstants.SessionCacheKey(fixture.UserId), out _));

        await fixture.WaitForEmailAsync();
        var email = Assert.Single(fixture.Emails);
        Assert.Equal("maria@example.com", email.To);
        Assert.Contains("password", email.Subject, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Verify#12345", email.Body);
    }

    [Fact]
    public async Task A_reset_signs_out_every_session_and_emails_the_owner()
    {
        var fixture = new Fixture();
        fixture.Cache.Set(AuthConstants.SessionCacheKey(fixture.UserId), "cached account");

        await fixture.Service.ResetPasswordAsync(RawToken, "Verify#12345");

        Assert.False(fixture.Cache.TryGetValue(AuthConstants.SessionCacheKey(fixture.UserId), out _));
        await fixture.WaitForEmailAsync();
        Assert.Single(fixture.Emails);
    }

    [Fact]
    public async Task A_refused_change_signs_nobody_out_and_sends_no_email()
    {
        var fixture = new Fixture();
        fixture.Cache.Set(AuthConstants.SessionCacheKey(fixture.UserId), "cached account");
        var request = new ChangePasswordRequest { CurrentPassword = CurrentPassword, NewPassword = CurrentPassword };

        await Assert.ThrowsAsync<NewPasswordSameAsCurrentException>(
            () => fixture.Service.ChangePasswordAsync(fixture.UserId, request));

        Assert.True(fixture.Cache.TryGetValue(AuthConstants.SessionCacheKey(fixture.UserId), out _));
        Assert.Empty(fixture.Emails);
    }

    [Fact]
    public async Task Five_wrong_current_passwords_lock_the_form_even_for_the_right_one()
    {
        var fixture = new Fixture();
        var wrong = new ChangePasswordRequest { CurrentPassword = "not-the-password-1", NewPassword = "Verify#12345" };

        for (var i = 0; i < 5; i++)
        {
            await Assert.ThrowsAsync<IncorrectCurrentPasswordException>(() => fixture.Service.ChangePasswordAsync(fixture.UserId, wrong));
        }

        var right = new ChangePasswordRequest { CurrentPassword = CurrentPassword, NewPassword = "Verify#12345" };
        var locked = await Assert.ThrowsAsync<TooManyPasswordAttemptsException>(() => fixture.Service.ChangePasswordAsync(fixture.UserId, right));

        Assert.InRange(locked.RetryAfterSeconds, 1, 15 * 60);
        Assert.Null(fixture.SavedHash);
    }

    [Fact]
    public async Task A_successful_change_clears_earlier_wrong_attempts()
    {
        var fixture = new Fixture();
        var wrong = new ChangePasswordRequest { CurrentPassword = "not-the-password-1", NewPassword = "Verify#12345" };
        for (var i = 0; i < 4; i++)
        {
            await Assert.ThrowsAsync<IncorrectCurrentPasswordException>(() => fixture.Service.ChangePasswordAsync(fixture.UserId, wrong));
        }

        await fixture.Service.ChangePasswordAsync(fixture.UserId, new ChangePasswordRequest { CurrentPassword = CurrentPassword, NewPassword = "Verify#12345" });

        Assert.Equal(0, fixture.Limiter.Count($"changepw:{fixture.UserId}", TimeSpan.FromMinutes(15)));
    }

    [Fact]
    public void A_login_carries_a_fingerprint_that_changes_with_the_password()
    {
        var tokens = new TokenService(Microsoft.Extensions.Options.Options.Create(new JwtOptions
        {
            Issuer = "test", Audience = "test", SigningKey = new string('k', 40), ExpiryMinutes = 5,
        }));
        string Fingerprint(string hash)
        {
            var user = new User { UserId = Guid.NewGuid(), Email = "a@b.test", FirstName = "A", LastName = "B", RoleName = "Applicant", PasswordHash = hash };
            var jwt = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler().ReadJwtToken(tokens.GenerateToken(user).Token);
            return jwt.Claims.Single(c => c.Type == PasswordFingerprint.ClaimType).Value;
        }

        var before = Fingerprint("hash-one");
        Assert.Equal(before, Fingerprint("hash-one"));
        Assert.NotEqual(before, Fingerprint("hash-two"));
        Assert.Equal(PasswordFingerprint.Of("hash-one"), before);
    }

    [Fact]
    public void The_weak_password_check_still_applies_to_reset_and_change_requests()
    {
        var weakReset = new ResetPasswordRequest { Token = RawToken, NewPassword = "Password123" };
        var weakChange = new ChangePasswordRequest { CurrentPassword = CurrentPassword, NewPassword = "Password123" };

        foreach (var request in new object[] { weakReset, weakChange })
        {
            var results = new List<ValidationResult>();
            Assert.False(Validator.TryValidateObject(request, new ValidationContext(request), results, validateAllProperties: true));
            Assert.Contains(results, r => r.ErrorMessage!.Contains("harder to guess"));
        }
    }
}
