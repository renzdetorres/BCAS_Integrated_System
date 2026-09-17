namespace BCAS.Api.Exceptions;

public class ScholarshipApplicationsClosedException : Exception
{
    public ScholarshipApplicationsClosedException()
        : base("Scholarship applications are currently closed. Please check back later.")
    {
    }
}
