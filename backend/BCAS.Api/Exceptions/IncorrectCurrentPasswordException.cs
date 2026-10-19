namespace BCAS.Api.Exceptions;

public class IncorrectCurrentPasswordException : Exception
{
    public IncorrectCurrentPasswordException()
        : base("Current password is incorrect.")
    {
    }

    public IncorrectCurrentPasswordException(string message)
        : base(message)
    {
    }
}
