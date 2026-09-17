namespace BCAS.Api.Exceptions;

public class InvalidApplicationTypeException : Exception
{
    public InvalidApplicationTypeException(string applicationType)
        : base($"'{applicationType}' is not a valid application type. Allowed values: NewStudent, Transferee.")
    {
    }
}
