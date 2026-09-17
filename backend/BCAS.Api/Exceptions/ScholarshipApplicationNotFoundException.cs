namespace BCAS.Api.Exceptions;

public class ScholarshipApplicationNotFoundException : Exception
{
    public ScholarshipApplicationNotFoundException(Guid applicationId)
        : base($"No scholarship application found with id '{applicationId}'.")
    {
    }
}
