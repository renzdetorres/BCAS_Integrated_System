using BCAS.Api.Controllers;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace BCAS.Api.Tests;

/// <summary>Who may change an account's email or role, the password prompt on a staff email change, and login pacing.</summary>
public class AccountProtectionTests
{
    private static T Stub<T>(Func<string, object?[], object?> handler) where T : class => PasswordReuseTests.Stub.Of<T>(handler);

    // ---------------------------------------------------------------- staff email change needs the password

    private const string CurrentPassword = "tulip-River-88";

    private sealed class AuthFixture
    {
        public Guid UserId { get; } = Guid.NewGuid();
        public AttemptLimiter Limiter { get; } = new();
        public List<string> EmailsTo { get; } = new();
        public AuthService Service { get; }
        private readonly TaskCompletionSource<bool> _sent = new(TaskCreationOptions.RunContinuationsAsynchronously);

        public AuthFixture()
        {
            var user = new User
            {
                UserId = UserId, Email = "maria@example.com", FirstName = "Maria", IsActive = true,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(CurrentPassword, workFactor: 4),
            };
            Service = new AuthService(
                Stub<IUserRepository>((name, _) => name == nameof(IUserRepository.GetByIdAsync) ? Task.FromResult<User?>(user) : throw new NotSupportedException(name)),
                Stub<ITokenService>((name, _) => throw new NotSupportedException(name)),
                Stub<IPasswordResetTokenRepository>((name, _) => throw new NotSupportedException(name)),
                Stub<IEmailSender>((_, args) =>
                {
                    EmailsTo.Add((string)args[0]!);
                    _sent.TrySetResult(true);
                    return Task.CompletedTask;
                }),
                Stub<IHostEnvironment>((name, _) => throw new NotSupportedException(name)),
                new MemoryCache(new MemoryCacheOptions()),
                Limiter,
                NullLogger<AuthService>.Instance);
        }

        public Task WaitForEmailAsync() => _sent.Task.WaitAsync(TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task An_unchanged_email_needs_no_password()
    {
        var fixture = new AuthFixture();

        Assert.Null(await fixture.Service.AuthorizeEmailChangeAsync(fixture.UserId, "Maria@Example.com ", null));
    }

    [Fact]
    public async Task A_changed_email_without_the_password_is_refused()
    {
        var fixture = new AuthFixture();

        var ex = await Assert.ThrowsAsync<IncorrectCurrentPasswordException>(
            () => fixture.Service.AuthorizeEmailChangeAsync(fixture.UserId, "thief@example.com", null));

        Assert.Contains("current password", ex.Message);
    }

    [Fact]
    public async Task A_changed_email_with_a_wrong_password_is_refused()
    {
        var fixture = new AuthFixture();

        await Assert.ThrowsAsync<IncorrectCurrentPasswordException>(
            () => fixture.Service.AuthorizeEmailChangeAsync(fixture.UserId, "thief@example.com", "not-the-password-1"));
    }

    [Fact]
    public async Task A_changed_email_with_the_right_password_returns_the_old_address()
    {
        var fixture = new AuthFixture();

        Assert.Equal("maria@example.com", await fixture.Service.AuthorizeEmailChangeAsync(fixture.UserId, "new@example.com", CurrentPassword));
    }

    [Fact]
    public async Task Guessing_the_password_through_the_email_form_hits_the_same_five_try_limit()
    {
        var fixture = new AuthFixture();
        for (var i = 0; i < 5; i++)
        {
            await Assert.ThrowsAsync<IncorrectCurrentPasswordException>(
                () => fixture.Service.AuthorizeEmailChangeAsync(fixture.UserId, "thief@example.com", "not-the-password-1"));
        }

        await Assert.ThrowsAsync<TooManyPasswordAttemptsException>(
            () => fixture.Service.AuthorizeEmailChangeAsync(fixture.UserId, "thief@example.com", CurrentPassword));
    }

    [Fact]
    public async Task The_old_address_is_told_when_the_email_changes()
    {
        var fixture = new AuthFixture();

        fixture.Service.NotifyEmailChanged("maria@example.com", "Maria", "new@example.com");
        await fixture.WaitForEmailAsync();

        Assert.Equal(new[] { "maria@example.com" }, fixture.EmailsTo);
    }

    // ---------------------------------------------------------------- only a Super Admin touches Admin accounts

    private static readonly Guid SuperId = Guid.NewGuid();
    private static readonly Guid PlainAdminId = Guid.NewGuid();

    private sealed class AdminFixture
    {
        public Dictionary<Guid, User> Users { get; } = new();
        public int Updates { get; private set; }
        public List<(string Old, string New)> Notices { get; } = new();
        public UserManagementService Service { get; }

        public AdminFixture()
        {
            Users[SuperId] = new User { UserId = SuperId, FirstName = "Sue", Email = "super@example.com", RoleName = "Admin", IsActive = true, IsSuperAdmin = true };
            Users[PlainAdminId] = new User { UserId = PlainAdminId, FirstName = "Pat", Email = "pat@example.com", RoleName = "Admin", IsActive = true };

            Service = new UserManagementService(
                Stub<IUserRepository>((name, args) => name switch
                {
                    nameof(IUserRepository.GetByIdAsync) => Task.FromResult(Users.GetValueOrDefault((Guid)args[0]!)),
                    nameof(IUserRepository.CountActiveSuperAdminsAsync) => Task.FromResult(2),
                    nameof(IUserRepository.UpdateAsync) => Update(args),
                    nameof(IUserRepository.SetActiveStatusAsync) => Task.FromResult(Users.GetValueOrDefault((Guid)args[0]!)),
                    _ => throw new NotSupportedException(name),
                }),
                Stub<ISuperAdminGuard>((name, args) => name switch
                {
                    nameof(ISuperAdminGuard.EnsureAsync) => (Guid)args[0]! == SuperId
                        ? Task.CompletedTask
                        : throw new SuperAdminRequiredException((string)args[1]!),
                    _ => throw new NotSupportedException(name),
                }),
                Stub<IAuthService>((name, args) =>
                {
                    if (name == nameof(IAuthService.NotifyEmailChanged))
                    {
                        Notices.Add(((string)args[0]!, (string)args[2]!));
                        return null;
                    }

                    throw new NotSupportedException(name);
                }),
                NullLogger<UserManagementService>.Instance);
        }

        public User Add(string email, string role)
        {
            var user = new User { UserId = Guid.NewGuid(), FirstName = "Ana", Email = email, RoleName = role, IsActive = true };
            Users[user.UserId] = user;
            return user;
        }

        private Task<User?> Update(object?[] args)
        {
            Updates++;
            var id = (Guid)args[0]!;
            return Task.FromResult<User?>(new User
            {
                UserId = id, FirstName = (string)args[1]!, LastName = (string)args[2]!, Email = (string)args[3]!,
                RoleName = (string)args[4]!, IsActive = true, IsSuperAdmin = Users[id].IsSuperAdmin,
            });
        }
    }

    private static UpdateUserRequest Edit(string email, string role) =>
        new() { FirstName = "X", LastName = "Y", Email = email, Role = role };

    [Fact]
    public async Task A_plain_admin_cannot_change_another_admins_email()
    {
        var fixture = new AdminFixture();

        await Assert.ThrowsAsync<SuperAdminRequiredException>(
            () => fixture.Service.UpdateUserAsync(PlainAdminId, SuperId, Edit("attacker@example.com", "Admin")));

        Assert.Equal(0, fixture.Updates);
    }

    [Fact]
    public async Task A_plain_admin_cannot_make_someone_an_admin()
    {
        var fixture = new AdminFixture();
        var applicant = fixture.Add("ana@example.com", "Applicant");

        await Assert.ThrowsAsync<SuperAdminRequiredException>(
            () => fixture.Service.UpdateUserAsync(PlainAdminId, applicant.UserId, Edit("ana@example.com", "Admin")));

        Assert.Equal(0, fixture.Updates);
    }

    [Fact]
    public async Task A_plain_admin_cannot_change_their_own_email_or_role_here()
    {
        var fixture = new AdminFixture();

        await Assert.ThrowsAsync<SuperAdminRequiredException>(
            () => fixture.Service.UpdateUserAsync(PlainAdminId, PlainAdminId, Edit("elsewhere@example.com", "Admin")));
    }

    [Fact]
    public async Task A_plain_admin_can_still_fix_their_own_name()
    {
        var fixture = new AdminFixture();

        var result = await fixture.Service.UpdateUserAsync(PlainAdminId, PlainAdminId, Edit("pat@example.com", "Admin"));

        Assert.Equal(1, fixture.Updates);
        Assert.Empty(fixture.Notices);
        Assert.Equal("pat@example.com", result.PreviousEmail);
    }

    [Fact]
    public async Task A_plain_admin_can_edit_a_non_admin_and_the_old_address_is_told()
    {
        var fixture = new AdminFixture();
        var evaluator = fixture.Add("eva@example.com", "Evaluator");

        var result = await fixture.Service.UpdateUserAsync(PlainAdminId, evaluator.UserId, Edit("eva.new@example.com", "Evaluator"));

        Assert.Equal(("eva@example.com", "eva.new@example.com"), Assert.Single(fixture.Notices));
        Assert.Equal("eva@example.com", result.PreviousEmail);
        Assert.Equal("Evaluator", result.PreviousRole);
    }

    [Fact]
    public async Task A_super_admin_can_change_an_admins_email_and_the_old_value_is_reported()
    {
        var fixture = new AdminFixture();

        var result = await fixture.Service.UpdateUserAsync(SuperId, PlainAdminId, Edit("pat.new@example.com", "Admin"));

        Assert.Equal("pat@example.com", result.PreviousEmail);
        Assert.Equal("pat.new@example.com", result.User.Email);
        Assert.Single(fixture.Notices);
    }

    [Fact]
    public async Task A_plain_admin_cannot_deactivate_another_admin_but_can_deactivate_others()
    {
        var fixture = new AdminFixture();
        var applicant = fixture.Add("ana@example.com", "Applicant");

        await Assert.ThrowsAsync<SuperAdminRequiredException>(
            () => fixture.Service.SetActiveStatusAsync(PlainAdminId, SuperId, false));

        await fixture.Service.SetActiveStatusAsync(PlainAdminId, applicant.UserId, false);
    }

    [Fact]
    public async Task Only_a_super_admin_can_create_an_admin_account()
    {
        var provisioning = new StaffProvisioningService(
            Stub<IUserRepository>((name, _) => throw new NotSupportedException(name)),
            Stub<ISuperAdminGuard>((name, args) => (Guid)args[0]! == SuperId ? Task.CompletedTask : throw new SuperAdminRequiredException((string)args[1]!)),
            NullLogger<StaffProvisioningService>.Instance);

        await Assert.ThrowsAsync<SuperAdminRequiredException>(() => provisioning.CreateStaffAsync(
            PlainAdminId,
            new ProvisionStaffRequest { FirstName = "N", LastName = "A", Email = "new.admin@example.com", Password = "tulip-River-88", Role = "Admin" }));
    }

    // ---------------------------------------------------------------- sign-in pacing and reset-link safety

    private sealed class ControllerFixture
    {
        public AttemptLimiter Limiter { get; } = new();
        public bool LoginSucceeds { get; set; }
        public string? ResetBaseUrl { get; private set; }
        public int ResetCalls { get; private set; }
        public AuthController Controller { get; }

        public ControllerFixture(string? frontendBaseUrl = null, string environment = "Production")
        {
            var env = Stub<IHostEnvironment>((name, _) => name == "get_EnvironmentName" ? environment : throw new NotSupportedException(name));
            var services = new ServiceCollection()
                .AddSingleton(Options.Create(new AuthCookieOptions()))
                .AddSingleton(env)
                .BuildServiceProvider();

            Controller = new AuthController(
                Stub<IAuthService>((name, args) => name switch
                {
                    nameof(IAuthService.LoginAsync) => LoginSucceeds
                        ? Task.FromResult(new LoginResult { User = new UserProfileResponse { Role = "Applicant" }, Token = "t", ExpiresAtUtc = DateTime.UtcNow.AddHours(1) })
                        : throw new InvalidCredentialsException(),
                    nameof(IAuthService.ForgotPasswordAsync) => Record((string)args[1]!),
                    _ => throw new NotSupportedException(name),
                }),
                Options.Create(new AuthCookieOptions()),
                Options.Create(new FrontendOptions { BaseUrl = frontendBaseUrl }),
                Stub<IAuditLogService>((name, _) => throw new NotSupportedException(name)),
                Limiter,
                env,
                Stub<ISuperAdminGuard>((name, _) => throw new NotSupportedException(name)),
                new MemoryCache(new MemoryCacheOptions()),
                NullLogger<AuthController>.Instance)
            {
                ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { RequestServices = services } },
            };
        }

        public void ComeFrom(string ip) => Controller.HttpContext.Connection.RemoteIpAddress = System.Net.IPAddress.Parse(ip);

        private Task Record(string baseUrl)
        {
            ResetCalls++;
            ResetBaseUrl = baseUrl;
            return Task.CompletedTask;
        }

        public async Task<IActionResult> LoginAsync(string email, string password) =>
            (await Controller.Login(new LoginRequest { Email = email, Password = password }, CancellationToken.None)).Result!;

        /// <summary>Thirty failed sign-ins on one email from thirty different addresses (a guesser rotating IPs).</summary>
        public async Task GuessFromManyAddressesAsync(string email)
        {
            for (var i = 0; i < 30; i++)
            {
                ComeFrom($"10.0.{i / 200}.{i % 200 + 1}");
                Assert.IsType<UnauthorizedObjectResult>(await LoginAsync(email, "wrong"));
            }
        }
    }

    [Fact]
    public async Task A_guessing_campaign_does_not_lock_the_real_owner_out()
    {
        var fixture = new ControllerFixture();
        await fixture.GuessFromManyAddressesAsync("maria@example.com");

        // The owner, from their own address with the right password, still gets in.
        fixture.ComeFrom("192.168.1.50");
        fixture.LoginSucceeds = true;
        var owner = await fixture.LoginAsync("maria@example.com", "right");

        Assert.IsType<OkObjectResult>(owner);
    }

    [Fact]
    public async Task Past_the_failure_limit_attempts_on_the_account_are_spaced_out()
    {
        var fixture = new ControllerFixture();
        await fixture.GuessFromManyAddressesAsync("maria@example.com");

        fixture.ComeFrom("192.168.1.51");
        Assert.IsType<UnauthorizedObjectResult>(await fixture.LoginAsync("maria@example.com", "guess"));

        // The next one straight away is held back, whoever it comes from.
        fixture.ComeFrom("192.168.1.52");
        var second = Assert.IsType<ObjectResult>(await fixture.LoginAsync("maria@example.com", "guess"));
        Assert.Equal(StatusCodes.Status429TooManyRequests, second.StatusCode);
        Assert.True(fixture.Controller.Response.Headers.ContainsKey("Retry-After"));
    }

    [Fact]
    public async Task A_correct_sign_in_clears_the_failures_counted_against_the_account()
    {
        var fixture = new ControllerFixture();
        await fixture.GuessFromManyAddressesAsync("maria@example.com");

        fixture.ComeFrom("192.168.1.50");
        fixture.LoginSucceeds = true;
        await fixture.LoginAsync("maria@example.com", "right");

        Assert.Equal(0, fixture.Limiter.Count("login:email:maria@example.com", TimeSpan.FromMinutes(10)));
    }

    [Fact]
    public async Task One_address_is_still_stopped_after_five_wrong_tries_on_an_email()
    {
        var fixture = new ControllerFixture();
        fixture.ComeFrom("203.0.113.9");
        for (var i = 0; i < 5; i++)
        {
            Assert.IsType<UnauthorizedObjectResult>(await fixture.LoginAsync("maria@example.com", "wrong"));
        }

        var sixth = Assert.IsType<ObjectResult>(await fixture.LoginAsync("maria@example.com", "wrong"));
        Assert.Equal(StatusCodes.Status429TooManyRequests, sixth.StatusCode);
    }

    [Fact]
    public async Task No_reset_link_is_built_from_the_host_header_on_the_live_site()
    {
        var fixture = new ControllerFixture(frontendBaseUrl: null, environment: "Production");
        fixture.Controller.Request.Host = new HostString("evil.example");
        fixture.ComeFrom("203.0.113.9");

        var result = await fixture.Controller.ForgotPassword(new ForgotPasswordRequest { Email = "maria@example.com" }, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        Assert.Equal(0, fixture.ResetCalls);
    }

    [Fact]
    public async Task The_reset_link_uses_the_configured_address()
    {
        var fixture = new ControllerFixture(frontendBaseUrl: "https://bcas.example.edu", environment: "Production");
        fixture.Controller.Request.Host = new HostString("evil.example");
        fixture.ComeFrom("203.0.113.9");

        await fixture.Controller.ForgotPassword(new ForgotPasswordRequest { Email = "maria@example.com" }, CancellationToken.None);

        Assert.Equal("https://bcas.example.edu", fixture.ResetBaseUrl);
    }

    [Fact]
    public async Task Local_development_may_still_use_the_request_address()
    {
        var fixture = new ControllerFixture(frontendBaseUrl: null, environment: "Development");
        fixture.Controller.Request.Scheme = "http";
        fixture.Controller.Request.Host = new HostString("localhost:7100");
        fixture.ComeFrom("127.0.0.1");

        await fixture.Controller.ForgotPassword(new ForgotPasswordRequest { Email = "maria@example.com" }, CancellationToken.None);

        Assert.Equal("http://localhost:7100", fixture.ResetBaseUrl);
    }
}
