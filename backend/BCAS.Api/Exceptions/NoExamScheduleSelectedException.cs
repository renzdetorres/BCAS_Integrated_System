namespace BCAS.Api.Exceptions;

public class NoExamScheduleSelectedException : Exception
{
    public NoExamScheduleSelectedException()
        : base("Select an entrance exam schedule before viewing your permit or requesting a reschedule.")
    {
    }
}
