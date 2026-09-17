using BCAS.Api.Models;

namespace BCAS.Api.Mapping;

public static class AnnouncementMappingExtensions
{
    public static AnnouncementResponse ToResponse(this Announcement announcement) => new()
    {
        AnnouncementId = announcement.AnnouncementId,
        Category = announcement.Category,
        Title = announcement.Title,
        Body = announcement.Body,
        PostedAt = announcement.PostedAt,
    };
}
