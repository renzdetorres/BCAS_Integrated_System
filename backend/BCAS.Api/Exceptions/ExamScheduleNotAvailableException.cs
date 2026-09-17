namespace BCAS.Api.Exceptions;

/// <summary>Exam schedule exists but isn't currently selectable (a weekday slot not offered).</summary>
public class ExamScheduleNotAvailableException : Exception
{
    public ExamScheduleNotAvailableException(string reason)
        : base(reason)
    {
    }
}
