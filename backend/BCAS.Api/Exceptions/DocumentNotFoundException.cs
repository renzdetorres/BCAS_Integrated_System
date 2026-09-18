namespace BCAS.Api.Exceptions;

public class DocumentNotFoundException : Exception
{
    public DocumentNotFoundException(Guid documentId)
        : base($"No document found with id '{documentId}'.")
    {
    }
}
