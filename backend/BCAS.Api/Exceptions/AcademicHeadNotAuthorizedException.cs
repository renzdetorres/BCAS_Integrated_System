namespace BCAS.Api.Exceptions;

public class AcademicHeadNotAuthorizedException : Exception
{
    public AcademicHeadNotAuthorizedException(string area)
        : base($"Academic Head is not currently authorized to manage {area}. Ask an Admin-Registrar to enable this in System Settings.")
    {
    }
}
