using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class DuplicateApplicantService : IDuplicateApplicantService
{
    private readonly IDuplicateApplicantRepository _repository;
    private readonly ILogger<DuplicateApplicantService> _logger;

    public DuplicateApplicantService(IDuplicateApplicantRepository repository, ILogger<DuplicateApplicantService> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task DetectAndFlagAsync(Guid newUserId, string firstName, string lastName, CancellationToken cancellationToken = default)
    {
        try
        {
            var matches = await _repository.FindNameMatchesAsync(firstName, lastName, newUserId, cancellationToken);

            foreach (var match in matches)
            {
                await _repository.InsertFlagAsync(
                    newUserId,
                    match.UserId,
                    $"Name closely matches an existing applicant account ({match.FirstName} {match.LastName}).",
                    cancellationToken);
            }

            if (matches.Count > 0)
            {
                _logger.LogInformation(
                    "New applicant {NewUserId} flagged as a potential duplicate of {MatchCount} existing account(s)",
                    newUserId,
                    matches.Count);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Duplicate-applicant detection failed for new user {NewUserId}", newUserId);
        }
    }

    public async Task<IReadOnlyList<DuplicateApplicantFlagResponse>> GetOpenFlagsAsync(CancellationToken cancellationToken = default)
    {
        var flags = await _repository.GetOpenFlagsAsync(cancellationToken);
        return flags.Select(f => f.ToResponse()).ToList();
    }

    public async Task<DuplicateApplicantFlagResponse> ResolveFlagAsync(
        Guid flagId, Guid reviewedByUserId, ResolveDuplicateFlagRequest request, CancellationToken cancellationToken = default)
    {
        if (!DuplicateApplicantConstants.AllowedResolutionStatuses.Contains(request.Status))
        {
            throw new InvalidDuplicateFlagStatusException(request.Status);
        }

        var notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();

        var resolved = await _repository.ResolveFlagAsync(flagId, request.Status, notes, reviewedByUserId, cancellationToken)
            ?? throw new DuplicateFlagNotFoundException(flagId);

        _logger.LogInformation("Duplicate-applicant flag {FlagId} resolved as {Status} by {ReviewedByUserId}", flagId, request.Status, reviewedByUserId);

        return resolved.ToResponse();
    }
}
