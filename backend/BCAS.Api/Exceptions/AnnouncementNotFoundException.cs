namespace BCAS.Api.Exceptions;

public class AnnouncementNotFoundException : Exception
{
    public AnnouncementNotFoundException(int announcementId)
        : base($"No announcement found with id '{announcementId}'.")
    {
    }
}
