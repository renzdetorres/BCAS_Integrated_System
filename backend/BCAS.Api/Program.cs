using System.Text;
using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

const string FrontendCorsPolicy = "FrontendCorsPolicy";

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
    ?? throw new InvalidOperationException("Jwt configuration section is missing.");
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.Configure<SmtpOptions>(builder.Configuration.GetSection(SmtpOptions.SectionName));
builder.Services.Configure<FrontendOptions>(builder.Configuration.GetSection(FrontendOptions.SectionName));
builder.Services.Configure<AuthCookieOptions>(builder.Configuration.GetSection(AuthCookieOptions.SectionName));

builder.Services.AddSingleton<IDbConnectionFactory, SqlConnectionFactory>();
builder.Services.AddSingleton<ITokenService, TokenService>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IPasswordResetTokenRepository, PasswordResetTokenRepository>();
builder.Services.AddScoped<IDuplicateApplicantRepository, DuplicateApplicantRepository>();
builder.Services.AddScoped<IDuplicateApplicantService, DuplicateApplicantService>();
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
builder.Services.AddScoped<INotificationPreferenceService, NotificationPreferenceService>();
builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();
builder.Services.AddScoped<INotificationDispatchService, NotificationDispatchService>();
builder.Services.AddScoped<IDeadlineReminderRepository, DeadlineReminderRepository>();
builder.Services.AddScoped<IDeadlineReminderService, DeadlineReminderService>();
builder.Services.AddHostedService<DeadlineReminderBackgroundService>();
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
        };
    });
builder.Services.AddAuthorization();

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
    {
        // Credentialed (cookie) requests require an explicit origin list -
        // AllowAnyOrigin cannot be combined with AllowCredentials.
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors(FrontendCorsPolicy);
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// The built React app (frontend/dist) is copied into wwwroot before publish
// (see .github/workflows/deploy-backend.yml) so this one app serves both the
// API and the SPA from the same origin - no separate frontend host, no CORS
// needed between them. MapControllers() above still wins for any /api/...
// route; this only catches requests nothing else matched (page reloads on a
// client-side route like /portal, direct links, etc.).
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapFallbackToFile("index.html");

app.Run();
