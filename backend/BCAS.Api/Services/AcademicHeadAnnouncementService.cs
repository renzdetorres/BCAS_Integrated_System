using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class AcademicHeadAnnouncementService : IAcademicHeadAnnouncementService
{
    private const string ManagementArea = "announcements";

    private readonly IAdminAnnouncementService _announcementService;
    private readonly ISystemSettingsRepository _systemSettingsRepository;

    public AcademicHeadAnnouncementService(
        IAdminAnnouncementService announcementService,
        ISystemSettingsRepository systemSettingsRepository)
    {
        _announcementService = announcementService;
        _systemSettingsRepository = systemSettingsRepository;
    }

    public async Task<IReadOnlyList<AdminAnnouncementResponse>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        await EnsureAuthorizedAsync(cancellationToken);
        return await _announcementService.GetAllAsync(cancellationToken);
    }

    public async Task<AdminAnnouncementResponse> CreateAsync(CreateAnnouncementRequest request, CancellationToken cancellationToken = default)
    {
        await EnsureAuthorizedAsync(cancellationToken);
        return await _announcementService.CreateAsync(request, cancellationToken);
    }

    public async Task<AdminAnnouncementResponse> SetActiveStatusAsync(int announcementId, bool isActive, CancellationToken cancellationToken = default)
    {
        await EnsureAuthorizedAsync(cancellationToken);
        return await _announcementService.SetActiveStatusAsync(announcementId, isActive, cancellationToken);
    }

    private async Task EnsureAuthorizedAsync(CancellationToken cancellationToken)
    {
        var isAuthorized = await _systemSettingsRepository.IsEnabledAsync(
            SystemSettingKeys.AcademicHeadAnnouncementManagementAuthorized, cancellationToken);

        if (!isAuthorized)
        {
            throw new AcademicHeadNotAuthorizedException(ManagementArea);
        }
    }
}
