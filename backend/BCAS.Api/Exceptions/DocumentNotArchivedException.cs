namespace BCAS.Api.Exceptions;

/// <summary>A restore was asked for on a document that is not in the archive (it was restored already, or never archived).</summary>
public class DocumentNotArchivedException : Exception
{
    public DocumentNotArchivedException(Guid documentId)
        : base($"The document '{documentId}' is not in the archive, so there is nothing to restore.")
    {
    }
}
