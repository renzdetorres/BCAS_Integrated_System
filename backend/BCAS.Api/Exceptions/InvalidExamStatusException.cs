namespace BCAS.Api.Exceptions;

public class InvalidExamStatusException : Exception
{
    public InvalidExamStatusException(string status)
        : base($"'{status}' is not a valid exam status. Use Scheduled, ExamDone, Rescheduled or DidNotTakeExam.")
    {
    }
}
