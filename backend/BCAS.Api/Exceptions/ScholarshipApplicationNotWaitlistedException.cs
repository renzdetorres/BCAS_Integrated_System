namespace BCAS.Api.Exceptions;

public class ScholarshipApplicationNotWaitlistedException : Exception
{
    public ScholarshipApplicationNotWaitlistedException(Guid applicationId, string currentStatus)
        : base($"Scholarship application '{applicationId}' is at status '{currentStatus}', not 'Waitlisted' - only a waitlisted application can be promoted.")
    {
    }
}
