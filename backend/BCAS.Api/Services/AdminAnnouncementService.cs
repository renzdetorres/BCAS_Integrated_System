using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class AdminAnnouncementService : IAdminAnnouncementService
{
    private readonly IAnnouncementRepository _announcementRepository;

    public AdminAnnouncementService(IAnnouncementRepository announcementRepository)
    {
        _announcementRepository = announcementRepository;
    }

    public async Task<IReadOnlyList<AdminAnnouncementResponse>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var announcements = await _announcementRepository.GetAllAsync(cancellationToken);
        return announcements.Select(a => a.ToAdminResponse()).ToList();
    }

    public async Task<AdminAnnouncementResponse> CreateAsync(CreateAnnouncementRequest request, CancellationToken cancellationToken = default)
    {
        var category = request.Category!;
        if (!AnnouncementConstants.AllowedCategories.Contains(category))
        {
            throw new InvalidAnnouncementCategoryException(category);
        }

        var created = await _announcementRepository.CreateAsync(category, request.Title.Trim(), request.Body.Trim(), cancellationToken);
        return created.ToAdminResponse();
    }

    public async Task<AdminAnnouncementResponse> SetActiveStatusAsync(int announcementId, bool isActive, CancellationToken cancellationToken = default)
    {
        var updated = await _announcementRepository.SetActiveStatusAsync(announcementId, isActive, cancellationToken)
            ?? throw new AnnouncementNotFoundException(announcementId);

        return updated.ToAdminResponse();
    }
}
