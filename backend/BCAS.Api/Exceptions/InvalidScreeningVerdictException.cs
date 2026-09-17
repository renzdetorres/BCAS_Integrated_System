namespace BCAS.Api.Exceptions;

public class InvalidScreeningVerdictException : Exception
{
    public InvalidScreeningVerdictException(string verdict)
        : base($"'{verdict}' is not a valid screening verdict. Allowed values: Qualified, NotQualified.")
    {
    }
}
