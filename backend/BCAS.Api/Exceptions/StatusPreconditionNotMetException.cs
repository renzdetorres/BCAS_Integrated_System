namespace BCAS.Api.Exceptions;

/// <summary>A status change is in the right order but its real-world condition (documents, exam schedule) is not met.</summary>
public class StatusPreconditionNotMetException : Exception
{
    public StatusPreconditionNotMetException(string message)
        : base(message)
    {
    }
}
