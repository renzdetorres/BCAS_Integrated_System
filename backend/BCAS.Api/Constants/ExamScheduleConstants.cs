namespace BCAS.Api.Constants;

public static class ExamScheduleConstants
{
    public static readonly IReadOnlySet<string> AllowedDayTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "Saturday",
        "Weekday",
    };
}
