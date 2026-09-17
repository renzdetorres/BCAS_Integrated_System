namespace BCAS.Api.Exceptions;

public class ProfileIncompleteException : Exception
{
    public ProfileIncompleteException()
        : base("Complete your profile before submitting an application.")
    {
    }
}
