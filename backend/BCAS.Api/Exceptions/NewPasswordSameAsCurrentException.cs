namespace BCAS.Api.Exceptions;

/// <summary>
/// Thrown when a password reset or change would set the password the account already has. Only ever raised
/// for a caller who holds a valid reset token or is signed in, so the message says nothing a stranger could use.
/// </summary>
public class NewPasswordSameAsCurrentException : Exception
{
    public NewPasswordSameAsCurrentException()
        : base("That's your current password. Please choose a new one.")
    {
    }
}
