namespace BCAS.Api.Services;

/// <summary>
/// The background check DeadlineReminderBackgroundService runs
/// periodically - see DeadlineReminderConstants for exactly what each of
/// the three reminders covers and its threshold. Never throws: each of the
/// three reminders runs inside its own try/catch, so one failing check
/// (e.g. a transient DB hiccup) never blocks the other two on the same run.
/// </summary>
public interface IDeadlineReminderService
{
    Task RunAsync(CancellationToken cancellationToken = default);
}
