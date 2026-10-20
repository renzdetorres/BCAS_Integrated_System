using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IDuplicateApplicantService
{
    /// <summary>
    /// Checks a freshly-registered applicant's name against existing
    /// accounts and flags any close match for review. Never throws - a
    /// failure here must not block or roll back an otherwise-successful
    /// registration, so it's logged and swallowed the same way
    /// NotificationDispatchService treats a send failure.
    /// </summary>
    Task DetectAndFlagAsync(Guid newUserId, string firstName, string lastName, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DuplicateApplicantFlagResponse>> GetOpenFlagsAsync(CancellationToken cancellationToken = default);

    Task<DuplicateApplicantFlagResponse> ResolveFlagAsync(
        Guid flagId, Guid reviewedByUserId, ResolveDuplicateFlagRequest request, CancellationToken cancellationToken = default);
}
