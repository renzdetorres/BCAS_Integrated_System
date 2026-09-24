namespace BCAS.Api.Exceptions;

public class InquiryThreadNotFoundException : Exception
{
    public InquiryThreadNotFoundException(Guid threadId)
        : base($"No inquiry thread found with id '{threadId}'.")
    {
    }
}
