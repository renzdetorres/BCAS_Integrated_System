namespace BCAS.Api.Constants;

public static class AnnouncementConstants
{
    public static readonly IReadOnlySet<string> AllowedCategories = new HashSet<string>(StringComparer.Ordinal)
    {
        "Admission",
        "Scholarship",
    };
}
