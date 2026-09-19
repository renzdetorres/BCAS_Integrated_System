namespace BCAS.Api.Exceptions;

public class InvalidStatusTransitionException : Exception
{
    public InvalidStatusTransitionException(Guid applicationId, string category, string fromStatus, string toStatus)
        : base(BuildMessage(applicationId, category, fromStatus, toStatus))
    {
    }

    private static string BuildMessage(Guid applicationId, string category, string fromStatus, string toStatus)
    {
        var workflow = category switch
        {
            "Admission" => "Submitted -> UnderReview -> Approved|Rejected",
            "Scholarship" => "Submitted -> DocumentsVerified -> EligibilityScreening -> Evaluation -> Result -> Approved|Rejected",
            _ => "its ordered workflow",
        };

        return $"{category} application '{applicationId}' cannot move from status '{fromStatus}' to '{toStatus}' - the workflow only moves forward, through {workflow}, and never changes once a decision is recorded.";
    }
}
