namespace BCAS.Api.Constants;

public static class ScholarshipScreeningConstants
{
    public static readonly IReadOnlySet<string> AllowedVerdicts = new HashSet<string>(StringComparer.Ordinal)
    {
        "Qualified",
        "NotQualified",
    };
}
