namespace BCAS.Api.Exceptions;

public class ScholarshipConsentRequiredException : Exception
{
    public ScholarshipConsentRequiredException()
        : base("You must agree to the consent terms, consent to the applicant's participation, and certify the information before submitting.")
    {
    }
}
