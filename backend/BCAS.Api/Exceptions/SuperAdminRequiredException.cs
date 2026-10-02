namespace BCAS.Api.Exceptions;

public class SuperAdminRequiredException : Exception
{
    public SuperAdminRequiredException(string action)
        : base($"Only a Super Admin can {action}.")
    {
    }
}
