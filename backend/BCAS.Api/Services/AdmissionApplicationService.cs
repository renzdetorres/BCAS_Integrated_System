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
    private readonly ILogger<AdmissionApplicationService> _logger;

    public AdmissionApplicationService(
        IAdmissionApplicationRepository applicationRepository,
        IApplicantProfileRepository profileRepository,
        ISystemSettingsRepository systemSettingsRepository,
        ILogger<AdmissionApplicationService> logger)
    {
        _applicationRepository = applicationRepository;
        _profileRepository = profileRepository;
        _systemSettingsRepository = systemSettingsRepository;
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
