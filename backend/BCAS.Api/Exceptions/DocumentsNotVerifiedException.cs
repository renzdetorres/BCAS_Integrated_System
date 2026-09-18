namespace BCAS.Api.Exceptions;

public class DocumentsNotVerifiedException : Exception
{
    public DocumentsNotVerifiedException()
        : base("This applicant's required documents must all be verified before the exam permit can be released.")
    {
    }
}
