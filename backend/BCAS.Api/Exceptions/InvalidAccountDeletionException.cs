namespace BCAS.Api.Exceptions;

/// <summary>An account can't be deleted: it's the caller's own, the last full-controls Admin, or it has recorded decisions.</summary>
public class InvalidAccountDeletionException : Exception
{
    public InvalidAccountDeletionException(string message)
        : base(message)
    {
    }
}
