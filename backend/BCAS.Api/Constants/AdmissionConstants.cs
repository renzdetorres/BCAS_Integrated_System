namespace BCAS.Api.Constants;

public static class AdmissionConstants
{
    public static readonly IReadOnlySet<string> AllowedApplicationTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "NewStudent",
        "Transferee",
    };
}
