namespace BCAS.Api.Exceptions;

public class ScholarshipWorkflowCannotAdvanceException : Exception
{
    public ScholarshipWorkflowCannotAdvanceException(Guid applicationId, string currentStatus)
        : base($"Scholarship application '{applicationId}' cannot be advanced further from status '{currentStatus}'.")
    {
    }
}
