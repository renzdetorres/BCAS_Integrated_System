namespace BCAS.Api.Exceptions;

public class InvalidBirthDateException : Exception
{
    public InvalidBirthDateException()
        : base("Birth date cannot be in the future.")
    {
    }
}
