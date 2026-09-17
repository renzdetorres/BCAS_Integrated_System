namespace BCAS.Api.Exceptions;

public class UserNotFoundException : Exception
{
    public UserNotFoundException(Guid userId)
        : base($"No account found with id '{userId}'.")
    {
    }
}
