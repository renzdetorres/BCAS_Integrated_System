namespace BCAS.Api.Exceptions;

public class InvalidAnnouncementCategoryException : Exception
{
    public InvalidAnnouncementCategoryException(string category)
        : base($"'{category}' is not a valid announcement category. Allowed values: Admission, Scholarship.")
    {
    }
}
