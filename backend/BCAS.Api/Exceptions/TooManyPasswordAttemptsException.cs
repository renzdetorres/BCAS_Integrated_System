namespace BCAS.Api.Exceptions;

/// <summary>
/// Thrown when a signed-in user has typed the wrong current password too many times in a row on the change-password
/// form. It slows down someone guessing the password from a session they don't own.
/// </summary>
public class TooManyPasswordAttemptsException : Exception
{
    public int RetryAfterSeconds { get; }

    public TooManyPasswordAttemptsException(int retryAfterSeconds)
        : base("Too many incorrect current passwords. Please wait a while and try again.")
    {
        RetryAfterSeconds = Math.Max(1, retryAfterSeconds);
    }
}
