namespace BCAS.Api.Exceptions;

/// <summary>A school configuration value is unknown or not allowed.</summary>
public class InvalidSchoolConfigException : Exception
{
    public InvalidSchoolConfigException(string message)
        : base(message)
    {
    }
}
