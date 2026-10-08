namespace BCAS.Api.Exceptions;

public class NoScholarshipApplicationException : Exception
{
    public NoScholarshipApplicationException()
        : base("Submit a scholarship application first.")
    {
    }
}
