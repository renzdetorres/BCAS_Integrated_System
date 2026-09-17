namespace BCAS.Api.Exceptions;

public class RescheduleRequestAlreadyPendingException : Exception
{
    public RescheduleRequestAlreadyPendingException()
        : base("You already have a pending reschedule request.")
    {
    }
}
