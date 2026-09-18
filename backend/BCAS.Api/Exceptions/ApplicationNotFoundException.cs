namespace BCAS.Api.Exceptions;

public class ApplicationNotFoundException : Exception
{
    public ApplicationNotFoundException(Guid applicationId)
        : base($"No application found with id '{applicationId}'.")
    {
    }
}
