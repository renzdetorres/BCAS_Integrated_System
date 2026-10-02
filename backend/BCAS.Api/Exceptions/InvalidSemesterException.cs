namespace BCAS.Api.Exceptions;

public class InvalidSemesterException : Exception
{
    public InvalidSemesterException(string message)
        : base(message)
    {
    }
}
