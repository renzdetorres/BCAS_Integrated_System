namespace BCAS.Api.Exceptions;

public class ScholarshipNotFoundException : Exception
{
    public ScholarshipNotFoundException(int scholarshipId)
        : base($"No scholarship found with id '{scholarshipId}'.")
    {
    }
}
