namespace BCAS.Api.Exceptions;

public class InvalidTotalSlotsException : Exception
{
    public InvalidTotalSlotsException(int occupiedSlots)
        : base($"Total slots cannot be set below the {occupiedSlots} slot(s) already occupied.")
    {
    }
}
