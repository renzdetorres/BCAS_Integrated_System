namespace BCAS.Api.Exceptions;

public class ScholarshipApplicationNotReadyForDecisionException : Exception
{
    public ScholarshipApplicationNotReadyForDecisionException(Guid applicationId, string currentStatus)
        : base($"Scholarship application '{applicationId}' is at status '{currentStatus}' - a final decision can only be confirmed once it reaches 'Result'.")
    {
    }
}
