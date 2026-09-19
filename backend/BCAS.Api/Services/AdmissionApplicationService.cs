using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class AdmissionApplicationService : IAdmissionApplicationService
{
    private readonly IAdmissionApplicationRepository _applicationRepository;
    private readonly IApplicantProfileRepository _profileRepository;
    private readonly ISystemSettingsRepository _systemSettingsRepository;
    private readonly IApplicationStatusHistoryRepository _statusHistoryRepository;
    private readonly IUserRepository _userRepository;
    private readonly INotificationDispatchService _notificationDispatchService;
    private readonly ILogger<AdmissionApplicationService> _logger;

    public AdmissionApplicationService(
        IAdmissionApplicationRepository applicationRepository,
        IApplicantProfileRepository profileRepository,
        ISystemSettingsRepository systemSettingsRepository,
        IApplicationStatusHistoryRepository statusHistoryRepository,
        IUserRepository userRepository,
        INotificationDispatchService notificationDispatchService,
        ILogger<AdmissionApplicationService> logger)
    {
        _applicationRepository = applicationRepository;
        _profileRepository = profileRepository;
        _systemSettingsRepository = systemSettingsRepository;
        _statusHistoryRepository = statusHistoryRepository;
        _userRepository = userRepository;
        _notificationDispatchService = notificationDispatchService;
        _logger = logger;
    }

    public async Task<AdmissionApplicationResponse> SubmitAsync(
        Guid userId,
        SubmitAdmissionApplicationRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!await _systemSettingsRepository.IsEnabledAsync(SystemSettingKeys.AdmissionsApplicationsOpen, cancellationToken))
        {
            throw new AdmissionApplicationsClosedException();
        }

        if (!AdmissionConstants.AllowedApplicationTypes.Contains(request.ApplicationType))
        {
            throw new InvalidApplicationTypeException(request.ApplicationType);
        }

        if (!await _profileRepository.ExistsAsync(userId, cancellationToken))
        {
            throw new ProfileIncompleteException();
        }

        var application = await _applicationRepository.CreateAsync(userId, request, cancellationToken);

        // The opening row of this application's status-history audit trail
        // (BISAASS-56) - FromStatus/changedByUserId both null since there's
        // no prior status and this is the applicant's own action, not staff's.
        await _statusHistoryRepository.InsertAsync(
            application.ApplicationId, "Admission", fromStatus: null, toStatus: application.Status, remarks: null, changedByUserId: null, cancellationToken);

        // Application Received notification (BISAASS-59).
        var applicant = await _userRepository.GetByIdAsync(userId, cancellationToken);
        if (applicant is not null)
        {
            await _notificationDispatchService.NotifyApplicationReceivedAsync(
                userId, applicant.Email, applicant.FirstName, "Admission", application.CourseAppliedFor, cancellationToken);
        }

        _logger.LogInformation(
            "Admission application {ApplicationId} submitted by {UserId}",
            application.ApplicationId,
            userId);

        return application.ToResponse();
    }

    public async Task<IReadOnlyList<AdmissionApplicationResponse>> GetMyApplicationsAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var applications = await _applicationRepository.GetByUserIdAsync(userId, cancellationToken);
        return applications.Select(a => a.ToResponse()).ToList();
    }
}
