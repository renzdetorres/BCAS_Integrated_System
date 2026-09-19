using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class AdminAnnouncementService : IAdminAnnouncementService
{
    private readonly IAnnouncementRepository _announcementRepository;
    private readonly IUserRepository _userRepository;
    private readonly INotificationDispatchService _notificationDispatchService;

    public AdminAnnouncementService(
        IAnnouncementRepository announcementRepository,
        IUserRepository userRepository,
        INotificationDispatchService notificationDispatchService)
    {
        _announcementRepository = announcementRepository;
        _userRepository = userRepository;
        _notificationDispatchService = notificationDispatchService;
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
        var existing = await _announcementRepository.GetAllAsync(cancellationToken);
        var wasActive = existing.FirstOrDefault(a => a.AnnouncementId == announcementId)?.IsActive ?? false;

        var updated = await _announcementRepository.SetActiveStatusAsync(announcementId, isActive, cancellationToken)
            ?? throw new AnnouncementNotFoundException(announcementId);

        // Important Announcements notification (BISAASS-59) - only when an
        // announcement is newly posted (going from inactive to active), not
        // every toggle, and never for a deactivation.
        if (isActive && !wasActive)
        {
            var users = await _userRepository.GetAllAsync(cancellationToken);
            var recipients = users
                .Where(u => u.RoleName == "Applicant")
                .Select(u => (u.UserId, u.Email, u.FirstName))
                .ToList();

            await _notificationDispatchService.NotifyAnnouncementAsync(recipients, updated.Title, updated.Body, cancellationToken);
        }

        return updated.ToAdminResponse();
    }
}
