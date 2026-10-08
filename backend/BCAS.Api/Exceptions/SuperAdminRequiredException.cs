namespace BCAS.Api.Exceptions;

public class SuperAdminRequiredException : Exception
{
    public SuperAdminRequiredException(string action)
        : base($"Only an Admin with full controls can {action}.")
    {
    }
}
