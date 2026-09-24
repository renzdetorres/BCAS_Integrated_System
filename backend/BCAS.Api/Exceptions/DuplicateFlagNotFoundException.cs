namespace BCAS.Api.Exceptions;

public class DuplicateFlagNotFoundException : Exception
{
    public DuplicateFlagNotFoundException(Guid flagId)
        : base($"No duplicate-applicant flag found with id '{flagId}'.")
    {
    }
}
