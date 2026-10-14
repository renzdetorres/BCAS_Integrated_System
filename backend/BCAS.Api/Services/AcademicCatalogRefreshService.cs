using BCAS.Api.Constants;

namespace BCAS.Api.Services;

/// <summary>
/// Keeps AcademicCatalog.Current in step with dbo.SchoolConfig: loads it when the
/// app starts and again every minute, so a change saved on one server instance
/// reaches the others. The instance that saves refreshes itself immediately.
/// A failed load keeps the last good snapshot (the built-in defaults at first).
/// </summary>
public class AcademicCatalogRefreshService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(1);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AcademicCatalogRefreshService> _logger;

    public AcademicCatalogRefreshService(IServiceScopeFactory scopeFactory, ILogger<AcademicCatalogRefreshService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Interval);

        do
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var config = scope.ServiceProvider.GetRequiredService<ISchoolConfigService>();
                AcademicCatalog.Apply(await config.GetAllAsync(stoppingToken));
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not refresh the academic catalog; keeping the last known lists.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
