namespace BCAS.Api.Exceptions;

public class InvalidDocumentTypeException : Exception
{
    public InvalidDocumentTypeException(string documentType)
        : base($"'{documentType}' is not a valid document type.")
    {
    }
}
