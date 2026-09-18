namespace BCAS.Api.Exceptions;

public class ApplicationAlreadyArchivedException : Exception
{
    public ApplicationAlreadyArchivedException(Guid applicationId)
        : base($"Application '{applicationId}' is already archived.")
    {
    }
}
