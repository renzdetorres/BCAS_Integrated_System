namespace BCAS.Api.Constants;

public static class ExamScheduleConstants
{
    public static readonly IReadOnlySet<string> AllowedDayTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "Saturday",
        "Weekday",
    };

    public static readonly IReadOnlySet<string> AllowedExamStatuses = new HashSet<string>(StringComparer.Ordinal)
    {
        "Scheduled",
        "ExamDone",
        "Rescheduled",
        "DidNotTakeExam",
    };
}
