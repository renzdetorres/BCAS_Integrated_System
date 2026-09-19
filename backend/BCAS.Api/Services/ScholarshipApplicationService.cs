using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class ScholarshipApplicationService : IScholarshipApplicationService
{
    private readonly IScholarshipApplicationRepository _applicationRepository;
    private readonly IApplicantProfileRepository _profileRepository;
    private readonly ISystemSettingsRepository _systemSettingsRepository;
    private readonly IApplicationStatusHistoryRepository _statusHistoryRepository;
    private readonly ILogger<ScholarshipApplicationService> _logger;

    public ScholarshipApplicationService(
        IScholarshipApplicationRepository applicationRepository,
        IApplicantProfileRepository profileRepository,
        ISystemSettingsRepository systemSettingsRepository,
        IApplicationStatusHistoryRepository statusHistoryRepository,
        ILogger<ScholarshipApplicationService> logger)
    {
        _applicationRepository = applicationRepository;
        _profileRepository = profileRepository;
        _systemSettingsRepository = systemSettingsRepository;
        _statusHistoryRepository = statusHistoryRepository;
        _logger = logger;
    }

    public async Task<ScholarshipApplicationResponse> SubmitAsync(
        Guid userId,
        SubmitScholarshipApplicationRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!await _systemSettingsRepository.IsEnabledAsync(SystemSettingKeys.ScholarshipApplicationsOpen, cancellationToken))
        {
            throw new ScholarshipApplicationsClosedException();
        }

        if (!await _profileRepository.ExistsAsync(userId, cancellationToken))
        {
            throw new ProfileIncompleteException();
        }

        var application = await _applicationRepository.CreateAsync(
            userId,
            request.ScholarshipId!.Value,
            request.GradeAverage!.Value,
            cancellationToken);

        // The opening row of this application's status-history audit trail
        // (BISAASS-57) - FromStatus/changedByUserId both null since there's
        // no prior status and this is the applicant's own action, not staff's.
        await _statusHistoryRepository.InsertAsync(
            application.ApplicationId, "Scholarship", fromStatus: null, toStatus: application.Status, remarks: null, changedByUserId: null, cancellationToken);

        _logger.LogInformation(
            "Scholarship application {ApplicationId} submitted by {UserId} for scholarship {ScholarshipId}",
            application.ApplicationId,
            userId,
            application.ScholarshipId);

        return application.ToResponse();
    }

    public async Task<IReadOnlyList<ScholarshipApplicationResponse>> GetMyApplicationsAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var applications = await _applicationRepository.GetByUserIdAsync(userId, cancellationToken);
        return applications.Select(a => a.ToResponse()).ToList();
    }
}
