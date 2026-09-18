namespace BCAS.Api.Exceptions;

public class InvalidApplicationCategoryException : Exception
{
    public InvalidApplicationCategoryException(string category)
        : base($"'{category}' is not a valid application category. Allowed values: Admission, Scholarship.")
    {
    }
}
