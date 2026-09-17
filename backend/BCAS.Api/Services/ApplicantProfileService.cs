using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class ApplicantProfileService : IApplicantProfileService
{
    private readonly IApplicantProfileRepository _profileRepository;
    private readonly ILogger<ApplicantProfileService> _logger;

    public ApplicantProfileService(IApplicantProfileRepository profileRepository, ILogger<ApplicantProfileService> logger)
    {
        _profileRepository = profileRepository;
        _logger = logger;
    }

    public async Task<ApplicantProfileResponse?> GetMyProfileAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var profile = await _profileRepository.GetByUserIdAsync(userId, cancellationToken);
        return profile?.ToResponse();
    }

    public async Task<ApplicantProfileResponse> SaveMyProfileAsync(
        Guid userId,
        UpsertApplicantProfileRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.BirthDate!.Value > DateOnly.FromDateTime(DateTime.UtcNow))
        {
            throw new InvalidBirthDateException();
        }

        var profile = await _profileRepository.UpsertAsync(userId, request, cancellationToken);

        _logger.LogInformation("Applicant profile saved for {UserId}", userId);

        return profile.ToResponse();
    }
}
