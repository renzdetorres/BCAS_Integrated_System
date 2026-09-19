namespace BCAS.Api.Exceptions;

public class DocumentAlreadyReviewedException : Exception
{
    public DocumentAlreadyReviewedException(Guid documentId, string currentStatus)
        : base($"Document '{documentId}' cannot be reviewed - its status is already '{currentStatus}', a final decision. Ask the applicant to re-upload it, which resets it to Pending for another review.")
    {
    }
}
