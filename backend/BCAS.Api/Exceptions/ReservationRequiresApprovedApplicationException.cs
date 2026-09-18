namespace BCAS.Api.Exceptions;

public class ReservationRequiresApprovedApplicationException : Exception
{
    public ReservationRequiresApprovedApplicationException()
        : base("Only approved admission applications can have a reservation recorded.")
    {
    }
}
