namespace BCAS.Api.Exceptions;

public class InvalidDayTypeException : Exception
{
    public InvalidDayTypeException(string dayType)
        : base($"'{dayType}' is not a valid day type. Allowed values: Saturday, Weekday.")
    {
    }
}
