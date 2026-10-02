namespace BCAS.Api.Exceptions;

public class SemesterNotFoundException : Exception
{
    public SemesterNotFoundException(int semesterId)
        : base($"No semester found with id '{semesterId}'.")
    {
    }
}
