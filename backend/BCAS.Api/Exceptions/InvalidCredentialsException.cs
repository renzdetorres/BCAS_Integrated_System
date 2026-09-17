namespace BCAS.Api.Exceptions;

/// <summary>
/// Thrown for any login failure (unknown email, wrong password, inactive
/// account). Always surfaced with the same generic message so responses
/// cannot be used to enumerate registered emails.
/// </summary>
public class InvalidCredentialsException : Exception
{
    public InvalidCredentialsException()
        : base("Invalid email or password.")
    {
    }
}
