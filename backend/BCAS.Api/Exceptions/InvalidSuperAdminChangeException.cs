namespace BCAS.Api.Exceptions;

public class InvalidSuperAdminChangeException : Exception
{
    public InvalidSuperAdminChangeException(string message)
        : base(message)
    {
    }
}
