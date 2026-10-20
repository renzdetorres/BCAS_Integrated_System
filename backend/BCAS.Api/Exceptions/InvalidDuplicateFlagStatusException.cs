namespace BCAS.Api.Exceptions;

public class InvalidDuplicateFlagStatusException : Exception
{
    public InvalidDuplicateFlagStatusException(string status)
        : base($"'{status}' is not a valid resolution for a duplicate-applicant flag. Use 'Dismissed' or 'ConfirmedDuplicate'.")
    {
    }
}
