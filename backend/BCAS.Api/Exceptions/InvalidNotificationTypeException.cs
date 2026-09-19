namespace BCAS.Api.Exceptions;

public class InvalidNotificationTypeException : Exception
{
    public InvalidNotificationTypeException(string notificationType)
        : base($"'{notificationType}' is not a valid notification type.")
    {
    }
}
