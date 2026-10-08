using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

/// <summary>
/// Runs once at startup and says, in the console, which database this API is
/// talking to - and what is missing from it if it is out of date. The usual
/// way to hit this is starting the API outside the Development environment,
/// which silently falls back to the default connection string in
/// appsettings.json (a different server) instead of the developer's own
/// database; every query touching a newer column then fails with a bare
/// HTTP 500, which the login page can only report as "Login failed".
/// Reports problems loudly but never stops the app: deployments manage the
/// schema separately, and the database may legitimately still be starting.
/// </summary>
public static class DatabaseStartupCheck
{
    // One cheap probe per recent schema addition. Each returns non-NULL when
    // the object exists.
    private static readonly (string What, string Probe)[] Required =
    {
        ("column Users.IsSuperAdmin", "SELECT COL_LENGTH(N'dbo.Users', N'IsSuperAdmin')"),
        ("column AdmissionApplications.Department", "SELECT COL_LENGTH(N'dbo.AdmissionApplications', N'Department')"),
        ("columns ExamScheduleSelections.ExamType/ExamFee/InvoiceNumber", "SELECT CASE WHEN COL_LENGTH(N'dbo.ExamScheduleSelections', N'ExamType') IS NOT NULL AND COL_LENGTH(N'dbo.ExamScheduleSelections', N'ExamFee') IS NOT NULL AND COL_LENGTH(N'dbo.ExamScheduleSelections', N'InvoiceNumber') IS NOT NULL THEN 1 END"),
        ("columns ScholarshipApplications.LevelApplied/ConsentedAt", "SELECT CASE WHEN COL_LENGTH(N'dbo.ScholarshipApplications', N'LevelApplied') IS NOT NULL AND COL_LENGTH(N'dbo.ScholarshipApplications', N'ConsentedAt') IS NOT NULL THEN 1 END"),
        ("column ExamScheduleSelections.ExamStatus", "SELECT COL_LENGTH(N'dbo.ExamScheduleSelections', N'ExamStatus')"),
        ("table dbo.Semesters", "SELECT OBJECT_ID(N'dbo.Semesters', N'U')"),
        ("table dbo.SentReminders", "SELECT OBJECT_ID(N'dbo.SentReminders', N'U')"),
        ("view dbo.vw_ApplicantDepartments", "SELECT OBJECT_ID(N'dbo.vw_ApplicantDepartments', N'V')"),
    };

    public static async Task RunAsync(IConfiguration configuration, IHostEnvironment environment, ILogger logger)
    {
        var connectionString = configuration.GetConnectionString("BcasDb");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            logger.LogError("No connection string 'BcasDb' is configured.");
            return;
        }

        // Only server and database name - never the credentials.
        var builder = new SqlConnectionStringBuilder(connectionString);
        var target = $"database '{builder.InitialCatalog}' on '{builder.DataSource}'";

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync();

            var missing = new List<string>();
            foreach (var (what, probe) in Required)
            {
                await using var command = new SqlCommand(probe, connection);
                var result = await command.ExecuteScalarAsync();
                if (result is null || result is DBNull)
                {
                    missing.Add(what);
                }
            }

            if (missing.Count == 0)
            {
                logger.LogInformation("Using {Target} ({Environment} environment); schema is up to date.", target, environment.EnvironmentName);
                return;
            }

            logger.LogError(
                "Using {Target} ({Environment} environment), but it is missing: {Missing}. " +
                "Login and most screens will fail with HTTP 500 until this is fixed. " +
                "If this is not your development database, you most likely started the API outside the Development " +
                "environment - run it with the BCAS.Api launch profile (or set ASPNETCORE_ENVIRONMENT=Development). " +
                "Otherwise run database/schema.sql against this database.",
                target, environment.EnvironmentName, string.Join(", ", missing));
        }
        catch (SqlException ex)
        {
            logger.LogError(
                "Cannot connect to {Target} ({Environment} environment): {Message} " +
                "Check ConnectionStrings:BcasDb, that SQL Server is running, and that you started the API in the " +
                "environment you meant to (the BCAS.Api launch profile uses Development).",
                target, environment.EnvironmentName, ex.Message);
        }
    }
}
