namespace BCAS.Api.Exceptions;

public class InvalidApplicationStatusException : Exception
{
    public InvalidApplicationStatusException(string category, string status)
        : base($"'{status}' is not a valid status for a {category} application.")
    {
    }
}
