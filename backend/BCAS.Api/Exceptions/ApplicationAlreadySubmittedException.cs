namespace BCAS.Api.Exceptions;

/// <summary>An applicant may submit one admission application and one scholarship application.</summary>
public class ApplicationAlreadySubmittedException : Exception
{
    public ApplicationAlreadySubmittedException(string kind)
        : base($"You have already submitted {(kind == "admission" ? "an" : "a")} {kind} application. Only one {kind} application is allowed per applicant.")
    {
    }
}
