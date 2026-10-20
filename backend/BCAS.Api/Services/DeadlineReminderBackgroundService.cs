namespace BCAS.Api.Services;

/// <summary>
/// Runs DeadlineReminderService.RunAsync on a fixed interval for the
/// lifetime of the app. This is the first IHostedService/BackgroundService
/// in the project - everything else here is request-driven, but a deadline
/// reminder has no triggering HTTP request to hang off of, so it needs its
/// own periodic loop. IDeadlineReminderService and everything under it are
/// Scoped (raw ADO.NET connections aren't meant to be held open for the
/// app's whole lifetime), so each tick opens its own DI scope via
/// IServiceScopeFactory rather than injecting the scoped service directly
/// into this singleton-lifetime background service.
/// </summary>
public class DeadlineReminderBackgroundService : BackgroundService
{
    private static readonly TimeSpan CheckInterval = TimeSpan.FromHours(6);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DeadlineReminderBackgroundService> _logger;

    public DeadlineReminderBackgroundService(IServiceScopeFactory scopeFactory, ILogger<DeadlineReminderBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(CheckInterval);

        // Runs once immediately on startup, then again every CheckInterval -
        // safe to run this often regardless of interval, since
        // DeadlineReminderService's own SentReminders bookkeeping is what
        // actually prevents a duplicate send, not the timing of this loop.
        do
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var reminderService = scope.ServiceProvider.GetRequiredService<IDeadlineReminderService>();
                await reminderService.RunAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Deadline reminder background run failed");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
