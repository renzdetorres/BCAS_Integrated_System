namespace BCAS.Api.Exceptions;

public class PermitNotReleasedException : Exception
{
    public PermitNotReleasedException()
        : base("Your exam permit hasn't been released yet. It will appear here once your documents are verified and the registrar releases it.")
    {
    }
}
