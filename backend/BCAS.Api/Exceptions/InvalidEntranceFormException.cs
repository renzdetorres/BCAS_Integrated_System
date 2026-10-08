namespace BCAS.Api.Exceptions;

/// <summary>The entrance-exam application form is missing something it requires.</summary>
public class InvalidEntranceFormException : Exception
{
    public InvalidEntranceFormException(string message)
        : base(message)
    {
    }
}
