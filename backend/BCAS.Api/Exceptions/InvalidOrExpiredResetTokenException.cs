namespace BCAS.Api.Exceptions;

/// <summary>
/// Thrown for any reset-token failure (unknown, expired, already used).
/// Always surfaced with the same generic message - distinguishing "expired"
/// from "never existed" would let a caller probe for valid-looking tokens.
/// </summary>
public class InvalidOrExpiredResetTokenException : Exception
{
    public InvalidOrExpiredResetTokenException()
        : base("This password reset link is invalid or has expired. Please request a new one.")
    {
    }
}
