namespace BCAS.Api.Exceptions;

public class InvoiceNumberRequiredException : Exception
{
    public InvoiceNumberRequiredException()
        : base("Enter the sales invoice (SI) number for this payment.")
    {
    }
}
