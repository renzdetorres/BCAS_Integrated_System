using BCAS.Api.Data;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class AnnouncementService : IAnnouncementService
{
    private readonly IAnnouncementRepository _announcementRepository;

    public AnnouncementService(IAnnouncementRepository announcementRepository)
    {
        _announcementRepository = announcementRepository;
    }

    public async Task<IReadOnlyList<AnnouncementResponse>> GetActiveAsync(CancellationToken cancellationToken = default)
    {
        var announcements = await _announcementRepository.GetActiveAsync(cancellationToken);
        return announcements.Select(a => a.ToResponse()).ToList();
    }
}
