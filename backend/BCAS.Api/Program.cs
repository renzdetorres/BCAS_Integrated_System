using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

const string FrontendCorsPolicy = "FrontendCorsPolicy";

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
    ?? throw new InvalidOperationException("Jwt configuration section is missing.");
// A placeholder or short signing key would let anyone forge a login, so outside local development the site won't start with one.
if (!builder.Environment.IsDevelopment() && jwtOptions.SigningKeyProblem() is { } signingKeyProblem)
{
    throw new InvalidOperationException(signingKeyProblem);
}

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<AttemptLimiter>();
builder.Services.AddHsts(options => options.MaxAge = TimeSpan.FromDays(180));
builder.Services.Configure<SmtpOptions>(builder.Configuration.GetSection(SmtpOptions.SectionName));
builder.Services.Configure<FrontendOptions>(builder.Configuration.GetSection(FrontendOptions.SectionName));
builder.Services.Configure<AuthCookieOptions>(builder.Configuration.GetSection(AuthCookieOptions.SectionName));

builder.Services.AddSingleton<IDbConnectionFactory, SqlConnectionFactory>();
builder.Services.AddSingleton<ITokenService, TokenService>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IPasswordResetTokenRepository, PasswordResetTokenRepository>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IStaffProvisioningService, StaffProvisioningService>();
builder.Services.AddScoped<IUserManagementService, UserManagementService>();
builder.Services.AddScoped<IDeadlineRepository, DeadlineRepository>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IApplicantProfileRepository, ApplicantProfileRepository>();
builder.Services.AddScoped<IApplicantProfileService, ApplicantProfileService>();
builder.Services.AddScoped<IAdmissionApplicationRepository, AdmissionApplicationRepository>();
builder.Services.AddScoped<IAdmissionApplicationService, AdmissionApplicationService>();
builder.Services.AddScoped<IScholarshipRepository, ScholarshipRepository>();
builder.Services.AddScoped<IScholarshipService, ScholarshipService>();
builder.Services.AddScoped<IAdminScholarshipsService, AdminScholarshipsService>();
builder.Services.AddScoped<IScholarshipApplicationRepository, ScholarshipApplicationRepository>();
builder.Services.AddScoped<IScholarshipApplicationService, ScholarshipApplicationService>();
builder.Services.AddScoped<IApplicantDocumentRepository, ApplicantDocumentRepository>();
builder.Services.AddScoped<IApplicantDocumentService, ApplicantDocumentService>();
builder.Services.AddScoped<IApplicationHistoryRepository, ApplicationHistoryRepository>();
builder.Services.AddScoped<IApplicationHistoryService, ApplicationHistoryService>();
builder.Services.AddScoped<IExamScheduleRepository, ExamScheduleRepository>();
builder.Services.AddScoped<IExamScheduleService, ExamScheduleService>();
builder.Services.AddScoped<IExamRescheduleRequestRepository, ExamRescheduleRequestRepository>();
builder.Services.AddScoped<IExamPermitService, ExamPermitService>();
builder.Services.AddScoped<IAdminExamPermitService, AdminExamPermitService>();
builder.Services.AddScoped<IApplicationTrackingService, ApplicationTrackingService>();
builder.Services.AddScoped<IAnnouncementRepository, AnnouncementRepository>();
builder.Services.AddScoped<IAnnouncementService, AnnouncementService>();
builder.Services.AddScoped<IAdminAnnouncementService, AdminAnnouncementService>();
builder.Services.AddScoped<IAdminDashboardRepository, AdminDashboardRepository>();
builder.Services.AddScoped<IAdminDashboardService, AdminDashboardService>();
builder.Services.AddScoped<IAuditLogRepository, AuditLogRepository>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<INotificationSettingsRepository, NotificationSettingsRepository>();
builder.Services.AddScoped<INotificationSettingsService, NotificationSettingsService>();
builder.Services.AddScoped<ISystemSettingsRepository, SystemSettingsRepository>();
builder.Services.AddScoped<ISystemSettingsService, SystemSettingsService>();
builder.Services.AddScoped<ISchoolConfigRepository, SchoolConfigRepository>();
builder.Services.AddScoped<ISchoolConfigService, SchoolConfigService>();
builder.Services.AddScoped<IExamPaymentRepository, ExamPaymentRepository>();
builder.Services.AddScoped<IExamPaymentService, ExamPaymentService>();
builder.Services.AddScoped<IAdmissionSummaryService, AdmissionSummaryService>();
builder.Services.AddScoped<IAdmissionStatusReportService, AdmissionStatusReportService>();
builder.Services.AddScoped<IScholarshipPipelineService, ScholarshipPipelineService>();
builder.Services.AddScoped<IExamResultRepository, ExamResultRepository>();
builder.Services.AddScoped<IExamResultService, ExamResultService>();
builder.Services.AddScoped<IInterviewRepository, InterviewRepository>();
builder.Services.AddScoped<IInterviewService, InterviewService>();
builder.Services.AddScoped<IEvaluatorDashboardRepository, EvaluatorDashboardRepository>();
builder.Services.AddScoped<IEvaluatorDashboardService, EvaluatorDashboardService>();
builder.Services.AddScoped<IEvaluatorScholarshipApplicationRepository, EvaluatorScholarshipApplicationRepository>();
builder.Services.AddScoped<IEvaluatorScholarshipApplicationService, EvaluatorScholarshipApplicationService>();
builder.Services.AddScoped<IEvaluatorScholarshipSlotsService, EvaluatorScholarshipSlotsService>();
builder.Services.AddScoped<IEvaluatorSettingsService, EvaluatorSettingsService>();
builder.Services.AddScoped<IAdminApplicationsRepository, AdminApplicationsRepository>();
builder.Services.AddScoped<IAdminApplicationsService, AdminApplicationsService>();
builder.Services.AddScoped<IAdminExamScheduleService, AdminExamScheduleService>();
builder.Services.AddScoped<IAdminReservationRepository, AdminReservationRepository>();
builder.Services.AddScoped<IAdminReservationsService, AdminReservationsService>();
builder.Services.AddScoped<IAdminDocumentsRepository, AdminDocumentsRepository>();
builder.Services.AddScoped<IAdminDocumentsService, AdminDocumentsService>();
builder.Services.AddScoped<IAdminReportsRepository, AdminReportsRepository>();
builder.Services.AddScoped<IAdminReportsService, AdminReportsService>();
builder.Services.AddScoped<IAcademicHeadScholarshipsService, AcademicHeadScholarshipsService>();
builder.Services.AddScoped<IAcademicHeadAnnouncementService, AcademicHeadAnnouncementService>();
builder.Services.AddScoped<IAcademicHeadReportsService, AcademicHeadReportsService>();
builder.Services.AddScoped<IDepartmentScopeRepository, DepartmentScopeRepository>();
builder.Services.AddScoped<IAcademicHeadScopeService, AcademicHeadScopeService>();
builder.Services.AddScoped<ISemesterRepository, SemesterRepository>();
builder.Services.AddScoped<ISemesterService, SemesterService>();
builder.Services.AddScoped<ISuperAdminGuard, SuperAdminGuard>();
builder.Services.AddMemoryCache();
builder.Services.AddScoped<IRoleAccessRepository, RoleAccessRepository>();
builder.Services.AddScoped<IRoleAccessService, RoleAccessService>();
builder.Services.AddScoped<IAcademicHeadSettingsService, AcademicHeadSettingsService>();
builder.Services.AddScoped<ISupportStaffDashboardRepository, SupportStaffDashboardRepository>();
builder.Services.AddScoped<ISupportStaffDashboardService, SupportStaffDashboardService>();
builder.Services.AddScoped<ISupportStaffDocumentsRepository, SupportStaffDocumentsRepository>();
builder.Services.AddScoped<ISupportStaffDocumentsService, SupportStaffDocumentsService>();
builder.Services.AddScoped<ISupportStaffApplicantsRepository, SupportStaffApplicantsRepository>();
builder.Services.AddScoped<ISupportStaffApplicantsService, SupportStaffApplicantsService>();
builder.Services.AddScoped<ISupportStaffSettingsService, SupportStaffSettingsService>();
builder.Services.AddScoped<IApplicationStatusHistoryRepository, ApplicationStatusHistoryRepository>();
builder.Services.AddScoped<INotificationPreferenceRepository, NotificationPreferenceRepository>();
builder.Services.AddScoped<INotificationInboxRepository, NotificationInboxRepository>();
builder.Services.AddScoped<INotificationPreferenceService, NotificationPreferenceService>();
builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();
builder.Services.AddScoped<INotificationDispatchService, NotificationDispatchService>();
builder.Services.AddScoped<IDeadlineReminderRepository, DeadlineReminderRepository>();
builder.Services.AddScoped<IDeadlineReminderService, DeadlineReminderService>();
builder.Services.AddHostedService<DeadlineReminderBackgroundService>();
builder.Services.AddHostedService<AcademicCatalogRefreshService>();
builder.Services.AddScoped<IInquiryRepository, InquiryRepository>();
builder.Services.AddScoped<IApplicantInquiryService, ApplicantInquiryService>();
builder.Services.AddScoped<IStaffInquiryService, StaffInquiryService>();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Keep claim types exactly as issued (e.g. "sub", "email") instead of
        // the legacy remapping to long XML claim URIs.
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOptions.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SigningKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,
        };

        // The token travels in the HttpOnly cookie, not an Authorization header.
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                if (context.Request.Cookies.TryGetValue(AuthConstants.AuthCookieName, out var cookieToken))
                {
                    context.Token = cookieToken;
                }

                return Task.CompletedTask;
            },

            // A login is a signed token that stays valid until it expires, so on its own a deactivated account or a
            // changed role would keep working. This re-checks the account (cached for 30 seconds) on every request.
            OnTokenValidated = async context =>
            {
                var subject = context.Principal?.FindFirstValue(JwtRegisteredClaimNames.Sub);
                if (!Guid.TryParse(subject, out var userId))
                {
                    context.Fail("The login has no valid user.");
                    return;
                }

                var services = context.HttpContext.RequestServices;

                // Signed out (see AuthController.Logout): the token still verifies, but the session is over.
                var tokenId = context.Principal?.FindFirstValue(JwtRegisteredClaimNames.Jti);
                if (tokenId is not null && services.GetRequiredService<IMemoryCache>().TryGetValue(AuthConstants.RevokedTokenKey(tokenId), out _))
                {
                    context.Fail("This login was signed out.");
                    return;
                }

                var state = await services.GetRequiredService<IMemoryCache>().GetOrCreateAsync(AuthConstants.SessionCacheKey(userId), async entry =>
                {
                    entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(30);
                    var user = await services.GetRequiredService<IUserRepository>().GetByIdAsync(userId, context.HttpContext.RequestAborted);
                    return user is null ? null : new SessionState(user.IsActive, user.RoleName, PasswordFingerprint.Of(user.PasswordHash));
                });

                var roleInToken = context.Principal?.FindFirstValue(ClaimTypes.Role);
                if (state is null || !state.IsActive || !string.Equals(state.Role, roleInToken, StringComparison.Ordinal))
                {
                    context.Fail("The account was deactivated or its role changed.");
                    return;
                }

                // A login issued before the password was last changed or reset is no longer good (this also signs
                // out logins issued before this check existed, once, when it first ships).
                var fingerprintInToken = context.Principal?.FindFirstValue(PasswordFingerprint.ClaimType);
                if (!string.Equals(state.PasswordFingerprint, fingerprintInToken, StringComparison.Ordinal))
                {
                    context.Fail("The password was changed after this login was issued.");
                }
            },
        };
    });
// Deny by default: an endpoint with no [Authorize] still needs a signed-in user, so a controller added later can't be
// public by accident. The public endpoints (sign-in, registration, the academic catalog) carry [AllowAnonymous].
builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
});

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
    {
        // Credentialed (cookie) requests require an explicit origin list -
        // AllowAnyOrigin cannot be combined with AllowCredentials.
        if (builder.Environment.IsDevelopment())
        {
            // Vite moves to the next free port (5174, ...) when 5173 is busy,
            // which would otherwise silently block sign-in. Any localhost
            // origin is fine on a developer machine.
            policy.SetIsOriginAllowed(origin =>
                Uri.TryCreate(origin, UriKind.Absolute, out var uri) &&
                (uri.Host == "localhost" || uri.Host == "127.0.0.1"));
        }
        else
        {
            policy.WithOrigins(allowedOrigins);
        }

        policy.AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Without a mail login, password reset links and notification emails silently never arrive; say so in the log at start-up.
var smtpProblems = app.Services.GetRequiredService<Microsoft.Extensions.Options.IOptions<SmtpOptions>>().Value.Problems();
if (smtpProblems.Count > 0)
{
    app.Logger.LogWarning("Email is not set up, so password reset and notification emails will not be sent. {Problems}", string.Join(" ", smtpProblems));
}

// A site with no explicit address would have to build password reset links from whatever Host header a request
// carries, which a forged header could point at someone else's site, so it sends no reset emails at all.
if (!app.Environment.IsDevelopment() && string.IsNullOrWhiteSpace(app.Configuration["Frontend:BaseUrl"]))
{
    app.Logger.LogWarning("Frontend__BaseUrl is not set, so password reset emails are NOT sent (a link built from the request's Host header could be forged). Set Frontend__BaseUrl to this site's address, and AllowedHosts to its host name.");
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    // Tell browsers to use HTTPS for this site from now on.
    app.UseHsts();
}

// Headers that cost nothing and shut off whole classes of attack: no guessing file types, no framing the app
// inside another site, a short referrer, and a policy that only lets the page load its own scripts, styles and
// fonts. (Development skips the policy: the Swagger page there uses inline scripts.)
app.Use(async (context, next) =>
{
    var headers = context.Response.Headers;
    headers["X-Content-Type-Options"] = "nosniff";
    headers["X-Frame-Options"] = "DENY";
    headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()";
    if (!app.Environment.IsDevelopment())
    {
        headers["Content-Security-Policy"] =
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; " +
            "font-src 'self' data:; connect-src 'self'; frame-src 'self' blob:; object-src 'self' blob:; " +
            "base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
    }

    await next();
});

app.UseHttpsRedirection();
app.UseCors(FrontendCorsPolicy);

// An exception nothing else handled becomes a JSON 500 here, inside the CORS
// middleware, so the response keeps its CORS headers. Left to Kestrel, the
// error response is rebuilt without them and the browser discards it as a
// network failure - the page then can't tell a crashed API from an
// unreachable one. Development includes the exception's own message (the
// real cause, e.g. a missing column); other environments stay generic.
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex) when (!context.Response.HasStarted)
    {
        app.Logger.LogError(ex, "Unhandled exception for {Method} {Path}", context.Request.Method, context.Request.Path);
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await context.Response.WriteAsJsonAsync(new Microsoft.AspNetCore.Mvc.ProblemDetails
        {
            Title = "Server error",
            Status = StatusCodes.Status500InternalServerError,
            Detail = app.Environment.IsDevelopment()
                ? ex.Message
                : "Something went wrong on the server. Please try again.",
        });
    }
});

// The built React app's files (frontend/dist, copied into wwwroot before publish - see
// .github/workflows/deploy.yml) are public: they have to load before anyone can sign in. They are
// served here, ahead of authentication and the deny-by-default policy below, which would otherwise
// answer 401 to /assets/*.js and leave the page blank. Only files that exist in wwwroot are served;
// every API route is still protected.
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
// After authentication (needs the caller's role), before authorization: a page
// the Super Admin switched off for a role is refused here.
app.UseMiddleware<RoleAccessMiddleware>();
app.UseAuthorization();
app.MapControllers();

// The built React app (frontend/dist) is copied into wwwroot before publish
// (see .github/workflows/deploy-backend.yml) so this one app serves both the
// API and the SPA from the same origin - no separate frontend host, no CORS
// needed between them. MapControllers() above still wins for any /api/...
// route; this only catches requests nothing else matched (page reloads on a
// client-side route like /portal, direct links, etc.). The files themselves
// are served above, before authentication.
app.MapFallbackToFile("index.html").AllowAnonymous();

// Say which database this API is using, and what it is missing if it is the
// wrong or an outdated one (see DatabaseStartupCheck).
await DatabaseStartupCheck.RunAsync(app.Configuration, app.Environment, app.Logger);

app.Run();

/// <summary>What the login check remembers about an account for 30 seconds.</summary>
internal sealed record SessionState(bool IsActive, string Role, string PasswordFingerprint);
