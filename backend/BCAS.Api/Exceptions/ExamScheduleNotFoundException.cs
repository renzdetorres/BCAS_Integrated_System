namespace BCAS.Api.Exceptions;

public class ExamScheduleNotFoundException : Exception
{
    public ExamScheduleNotFoundException(int examScheduleId)
        : base($"No exam schedule found with id '{examScheduleId}'.")
    {
    }
}
