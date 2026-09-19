namespace BCAS.Api.Exceptions;

public class InvalidStatusTransitionException : Exception
{
    public InvalidStatusTransitionException(Guid applicationId, string fromStatus, string toStatus)
        : base($"Admission application '{applicationId}' cannot move from status '{fromStatus}' to '{toStatus}' - the workflow only moves forward, through Submitted -> UnderReview -> Approved|Rejected, and never changes once a decision is recorded.")
    {
    }
}
