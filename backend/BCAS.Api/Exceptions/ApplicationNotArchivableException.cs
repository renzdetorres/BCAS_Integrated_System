namespace BCAS.Api.Exceptions;

public class ApplicationNotArchivableException : Exception
{
    public ApplicationNotArchivableException(string status)
        : base($"Applications with status '{status}' cannot be archived. Only completed/inactive applications (Approved or Rejected) can be archived.")
    {
    }
}
