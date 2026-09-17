namespace BCAS.Api.Exceptions;

public class AdmissionApplicationsClosedException : Exception
{
    public AdmissionApplicationsClosedException()
        : base("Admission applications are currently closed. Please check back later.")
    {
    }
}
