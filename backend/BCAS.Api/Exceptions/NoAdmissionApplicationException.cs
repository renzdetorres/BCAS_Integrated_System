namespace BCAS.Api.Exceptions;

public class NoAdmissionApplicationException : Exception
{
    public NoAdmissionApplicationException()
        : base("Submit an admission application before uploading documents.")
    {
    }
}
