namespace BCAS.Api.Exceptions;

public class OnlinePaymentRequiredException : Exception
{
    public OnlinePaymentRequiredException()
        : base("Online payment is required for reservations while this setting is enabled; it cannot be recorded manually.")
    {
    }
}
