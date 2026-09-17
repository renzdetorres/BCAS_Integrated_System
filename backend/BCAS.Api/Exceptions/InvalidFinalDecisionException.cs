namespace BCAS.Api.Exceptions;

public class InvalidFinalDecisionException : Exception
{
    public InvalidFinalDecisionException(string decision)
        : base($"'{decision}' is not a valid final decision. Allowed values: Approved, Rejected.")
    {
    }
}
