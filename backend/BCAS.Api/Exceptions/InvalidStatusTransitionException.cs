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
            "Admission" => "Submitted -> UnderReview -> PendingDocuments -> DocumentsCompleted -> DocumentsCleared -> ExamScheduled -> ExamDone -> Registration -> Approved (Rejected or Retracted are possible until then)",
            "Scholarship" => "Submitted -> DocumentsVerified -> EligibilityScreening -> Evaluation -> Result -> Approved|Rejected",
            _ => "its ordered workflow",
        };

        return $"{category} application '{applicationId}' cannot move from status '{fromStatus}' to '{toStatus}' - the workflow moves one step at a time, through {workflow}, and never changes once the application is final.";
    }
}
