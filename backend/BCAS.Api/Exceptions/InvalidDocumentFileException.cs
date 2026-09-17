namespace BCAS.Api.Exceptions;

public class InvalidDocumentFileException : Exception
{
    public InvalidDocumentFileException(string message)
        : base(message)
    {
    }
}
