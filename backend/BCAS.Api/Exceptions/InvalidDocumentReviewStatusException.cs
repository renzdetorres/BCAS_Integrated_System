namespace BCAS.Api.Exceptions;

public class InvalidDocumentReviewStatusException : Exception
{
    public InvalidDocumentReviewStatusException(string status)
        : base($"'{status}' is not a valid review status. Allowed values: Verified, Rejected, Flagged.")
    {
    }
}
