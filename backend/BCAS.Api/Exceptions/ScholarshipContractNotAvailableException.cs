namespace BCAS.Api.Exceptions;

public class ScholarshipContractNotAvailableException : Exception
{
    public ScholarshipContractNotAvailableException(Guid applicationId)
        : base($"No printable contract is available for application '{applicationId}' - it must be an Approved scholarship application.")
    {
    }
}
