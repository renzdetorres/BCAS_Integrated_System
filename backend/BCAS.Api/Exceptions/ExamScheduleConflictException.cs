namespace BCAS.Api.Exceptions;

/// <summary>An exam schedule change the booking rules refuse (a duplicate time, a slot that has bookings, a date in the past).</summary>
public class ExamScheduleConflictException : Exception
{
    public ExamScheduleConflictException(string reason)
        : base(reason)
    {
    }
}
