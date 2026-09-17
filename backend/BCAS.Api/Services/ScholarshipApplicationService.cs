using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class ScholarshipApplicationService : IScholarshipApplicationService
{
    private readonly IScholarshipApplicationRepository _applicationRepository;
    private readonly IApplicantProfileRepository _profileRepository;
    private readonly ILogger<ScholarshipApplicationService> _logger;

    public ScholarshipApplicationService(
        IScholarshipApplicationRepository applicationRepository,
        IApplicantProfileRepository profileRepository,
        ILogger<ScholarshipApplicationService> logger)
    {
        _applicationRepository = applicationRepository;
        _profileRepository = profileRepository;
        _logger = logger;
    }

    public async Task<ScholarshipApplicationResponse> SubmitAsync(
        Guid userId,
        SubmitScholarshipApplicationRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!await _profileRepository.ExistsAsync(userId, cancellationToken))
        {
            throw new ProfileIncompleteException();
        }

        var application = await _applicationRepository.CreateAsync(
            userId,
            request.ScholarshipId!.Value,
            request.GradeAverage!.Value,
            cancellationToken);

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
