namespace BCAS.Api.Exceptions;

public class NotificationTriggerNotFoundException : Exception
{
    public NotificationTriggerNotFoundException(string triggerKey)
        : base($"'{triggerKey}' is not a configurable notification trigger.")
    {
    }
}
