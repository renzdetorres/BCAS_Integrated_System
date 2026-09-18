namespace BCAS.Api.Exceptions;

public class DocumentReviewReasonRequiredException : Exception
{
    public DocumentReviewReasonRequiredException(string status)
        : base($"A reason is required to mark a document as {status}.")
    {
    }
}
