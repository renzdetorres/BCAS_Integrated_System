namespace BCAS.Api.Exceptions;

public class InvalidInquiryStatusException : Exception
{
    public InvalidInquiryStatusException(string status)
        : base($"'{status}' is not a valid inquiry thread status. Use 'Open' or 'Closed'.")
    {
    }
}
