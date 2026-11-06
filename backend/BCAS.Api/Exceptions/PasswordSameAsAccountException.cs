namespace BCAS.Api.Exceptions;

/// <summary>
/// Thrown when a password reset or change would make the password the account's own email or username.
/// It is a kind of NewPasswordSameAsCurrentException, so every endpoint that already answers that with a
/// "Choose a different password" 400 answers this one the same way.
/// </summary>
public class PasswordSameAsAccountException : NewPasswordSameAsCurrentException
{
    public PasswordSameAsAccountException()
        : base("Your password can't be the same as your email or username.")
    {
    }
}
